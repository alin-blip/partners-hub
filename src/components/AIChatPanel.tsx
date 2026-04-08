import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, Plus, MessageSquare, ChevronLeft, Sparkles, Square, Phone, PhoneOff, MessageCircle, Globe, Mic } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type Msg = { role: "user" | "assistant"; content: string; timestamp?: Date };
type PanelMode = "text" | "call";

const LANGUAGES = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "ro", label: "Română", flag: "🇷🇴" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
  { value: "pt", label: "Português", flag: "🇵🇹" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
  { value: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const AGENT_TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-agent-token`;

/* ── helpers ─────────────────────────────────────────────── */

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSentences(text: string): { sentences: string[]; remainder: string } {
  const sentences: string[] = [];
  const regex = /[^.!?\n]+[.!?]+(?:\s|$)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = regex.lastIndex;
  }
  return { sentences, remainder: text.slice(lastIndex) };
}

let audioCtx: AudioContext | null = null;
function unlockAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

/* ── streaming chat ──────────────────────────────────────── */

async function streamChat({
  messages,
  conversationId,
  onDelta,
  onDone,
  onError,
  onConversationId,
}: {
  messages: Msg[];
  conversationId: string | null;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  onConversationId: (id: string) => void;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, conversation_id: conversationId }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "Unknown error" }));
    if (resp.status === 429) { onError("Too many requests. Please try again in a few seconds."); return; }
    if (resp.status === 402) { onError("Insufficient AI credit. Add funds in Settings → Usage."); return; }
    onError(body.error || `Error ${resp.status}`);
    return;
  }

  const newConvId = resp.headers.get("X-Conversation-Id");
  if (newConvId) onConversationId(newConvId);

  if (!resp.body) { onError("No response stream"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

/* ── TTS fetch ───────────────────────────────────────────── */

async function fetchTTSChunk(text: string): Promise<string | null> {
  try {
    const cleanText = stripMarkdown(text);
    if (!cleanText || cleanText.length < 3) return null;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: cleanText.slice(0, 3000) }),
    });

    if (!response.ok) return null;
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch {
    return null;
  }
}

/* ── constants ───────────────────────────────────────────── */

type Conversation = { id: string; title: string; updated_at: string };

const QUICK_ACTIONS = [
  { label: "📋 Commission structure", prompt: "How do agent commissions work?" },
  { label: "🎓 Enrollment process", prompt: "What are the enrollment steps?" },
  { label: "🛂 Visa guidance", prompt: "Explain UK Student Visa requirements" },
  { label: "📊 My students", prompt: "Show me a summary of my students" },
];

/* ── sub-components ──────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

/* ── Call Mode View ──────────────────────────────────────── */

function CallModeView() {
  const [callTranscript, setCallTranscript] = useState<Msg[]>([]);
  const [callConnecting, setCallConnecting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => {
      setCallConnecting(false);
      toast.success("Call connected!");
    },
    onDisconnect: () => {
      setCallConnecting(false);
    },
    onError: (error) => {
      console.error("Call error:", error);
      toast.error("Call failed. Please try again.");
      setCallConnecting(false);
    },
    onMessage: (message: any) => {
      if (message?.type === "user_transcript") {
        const text = message?.user_transcription_event?.user_transcript;
        if (text) {
          setCallTranscript((prev) => [...prev, { role: "user", content: text, timestamp: new Date() }]);
        }
      } else if (message?.type === "agent_response") {
        const text = message?.agent_response_event?.agent_response;
        if (text) {
          setCallTranscript((prev) => [...prev, { role: "assistant", content: text, timestamp: new Date() }]);
        }
      }
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [callTranscript]);

  const startCall = useCallback(async () => {
    setCallConnecting(true);
    setCallTranscript([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const resp = await fetch(AGENT_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ language: selectedLanguage }),
      });

      if (!resp.ok) throw new Error(`Token error: ${resp.status}`);
      const data = await resp.json();
      const signedUrl = data.signed_url;
      if (!signedUrl) throw new Error("No signed URL received");

      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: data.systemPrompt },
            firstMessage: data.firstMessage,
          },
        },
      });
    } catch (err: any) {
      console.error("Failed to start call:", err);
      toast.error(err.message || "Could not start the call");
      setCallConnecting(false);
    }
  }, [conversation, selectedLanguage]);

  const endCall = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;
  const selectedLang = LANGUAGES.find((l) => l.value === selectedLanguage);

  const statusText = callConnecting
    ? "Connecting…"
    : isConnected
      ? isSpeaking
        ? "Speaking…"
        : "Listening…"
      : "Ready to call";

  return (
    <div className="flex flex-col h-full">
      {/* Call Visual Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 relative overflow-hidden">
        {/* Background animated rings */}
        {isConnected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`absolute h-48 w-48 rounded-full border transition-all duration-1000 ${isSpeaking ? "border-primary/20 scale-110" : "border-accent/10 scale-100"}`} style={{ animation: "pulse 3s ease-in-out infinite" }} />
            <div className={`absolute h-64 w-64 rounded-full border transition-all duration-1000 ${isSpeaking ? "border-primary/10 scale-110" : "border-accent/5 scale-100"}`} style={{ animation: "pulse 3s ease-in-out infinite 0.5s" }} />
            <div className={`absolute h-80 w-80 rounded-full border transition-all duration-1000 ${isSpeaking ? "border-primary/5 scale-105" : "border-accent/[0.03] scale-100"}`} style={{ animation: "pulse 3s ease-in-out infinite 1s" }} />
          </div>
        )}

        {/* Main avatar orb */}
        <div className="relative z-10">
          <div
            className={`h-28 w-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-700 ${
              isConnected
                ? isSpeaking
                  ? "bg-gradient-to-br from-primary via-primary/80 to-accent scale-110 shadow-primary/30"
                  : "bg-gradient-to-br from-accent/80 via-accent to-accent/60 scale-100 shadow-accent/20"
                : "bg-gradient-to-br from-muted to-muted/80 shadow-md"
            }`}
          >
            {isConnected ? (
              <div className="flex items-center gap-[3px]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full bg-primary-foreground/90 transition-all ${
                      isSpeaking ? "animate-bounce" : "h-3"
                    }`}
                    style={{
                      height: isSpeaking ? undefined : "12px",
                      animationDelay: isSpeaking ? `${i * 120}ms` : undefined,
                      animationDuration: isSpeaking ? "0.6s" : undefined,
                    }}
                  />
                ))}
              </div>
            ) : (
              <Mic className="h-10 w-10 text-muted-foreground/60" />
            )}
          </div>
          {isConnected && (
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-accent border-2 border-background shadow-sm" />
          )}
        </div>

        {/* Status text */}
        <div className="text-center space-y-1 z-10">
          <p className="text-lg font-semibold text-foreground">EduForYou AI</p>
          <p className={`text-sm font-medium transition-colors duration-300 ${
            isConnected
              ? isSpeaking ? "text-primary" : "text-accent"
              : callConnecting ? "text-muted-foreground animate-pulse" : "text-muted-foreground"
          }`}>
            {statusText}
          </p>
        </div>

        {/* Language selector — only shown before call starts */}
        {!isConnected && !callConnecting && (
          <div className="z-10 w-full max-w-[220px]">
            <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5 justify-center">
              <Globe className="h-3 w-3" />
              Conversation Language
            </label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 text-sm">
                <SelectValue>
                  {selectedLang && (
                    <span className="flex items-center gap-2">
                      <span>{selectedLang.flag}</span>
                      <span>{selectedLang.label}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Call / End call button */}
        <div className="z-10">
          {!isConnected ? (
            <Button
              onClick={startCall}
              disabled={callConnecting}
              size="lg"
              className="h-14 px-8 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-xl gap-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <Phone className="h-5 w-5" />
              {callConnecting ? "Connecting…" : "Start Call"}
            </Button>
          ) : (
            <Button
              onClick={endCall}
              size="lg"
              variant="destructive"
              className="h-14 px-8 rounded-full shadow-xl gap-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105"
            >
              <PhoneOff className="h-5 w-5" />
              End Call
            </Button>
          )}
        </div>

        {/* Current language indicator during call */}
        {isConnected && selectedLang && (
          <div className="z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border/40 text-xs text-muted-foreground">
            <span>{selectedLang.flag}</span>
            <span>{selectedLang.label}</span>
          </div>
        )}
      </div>

      {/* Live Transcript */}
      {callTranscript.length > 0 && (
        <div className="border-t border-border/50 max-h-[200px] bg-muted/20">
          <p className="text-[11px] text-muted-foreground px-4 pt-2 pb-1 font-medium uppercase tracking-wide">Transcript</p>
          <div ref={scrollRef} className="overflow-y-auto px-4 pb-3 space-y-2 max-h-[160px]">
            {callTranscript.map((msg, i) => (
              <div key={i} className={`flex gap-2 items-start text-xs msg-animate ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <span className="shrink-0 h-5 w-5 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-[8px] text-primary-foreground font-bold mt-0.5">AI</span>
                )}
                <span className={`inline-block max-w-[80%] px-2.5 py-1.5 rounded-xl ${
                  msg.role === "user"
                    ? "bg-primary/10 text-foreground rounded-br-sm"
                    : "bg-muted/70 text-foreground border border-border/30 rounded-bl-sm"
                }`}>
                  {msg.content}
                </span>
                {msg.role === "user" && (
                  <span className="shrink-0 h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center text-[8px] text-accent-foreground font-bold mt-0.5">U</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── main component ──────────────────────────────────────── */

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mode, setMode] = useState<PanelMode>("text");

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<string[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const cancelledRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      return (data || []) as Conversation[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => stopAllAudio();
  }, []);

  /* ── audio queue ─────────────────────────────────────── */

  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current || cancelledRef.current) return;
    if (audioQueueRef.current.length === 0) { setSpeaking(false); return; }

    isPlayingRef.current = true;
    const url = audioQueueRef.current.shift()!;

    try {
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject();
        audio.play().catch(reject);
      });
      URL.revokeObjectURL(url);
    } catch { /* ignore */ } finally {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      if (!cancelledRef.current) playNextInQueue();
    }
  }, []);

  const enqueueAudio = useCallback((url: string) => {
    audioQueueRef.current.push(url);
    setSpeaking(true);
    if (!isPlayingRef.current) playNextInQueue();
  }, [playNextInQueue]);

  const stopAllAudio = useCallback(() => {
    cancelledRef.current = true;
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    isPlayingRef.current = false;
    setSpeaking(false);
    setTimeout(() => { cancelledRef.current = false; }, 50);
  }, []);

  /* ── conversation management ─────────────────────────── */

  const loadConversation = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    }
    setActiveConversationId(convId);
    setShowHistory(false);
  }, []);

  const startNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setShowHistory(false);
    stopAllAudio();
  };

  /* ── send message ────────────────────────────────────── */

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    unlockAudio();
    cancelledRef.current = false;

    const userMsg: Msg = { role: "user", content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    stopAllAudio();

    let assistantSoFar = "";
    let ttsBuffer = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar, timestamp: new Date() }];
      });

      if (!cancelledRef.current) {
        ttsBuffer += chunk;
        const { sentences, remainder } = extractSentences(ttsBuffer);
        if (sentences.length > 0) {
          for (const sentence of sentences) {
            fetchTTSChunk(sentence).then((url) => {
              if (url && !cancelledRef.current) enqueueAudio(url);
            });
          }
          ttsBuffer = remainder;
        }
      }
    };

    await streamChat({
      messages: newMessages,
      conversationId: activeConversationId,
      onDelta: upsert,
      onDone: async () => {
        setLoading(false);
        queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
        if (ttsBuffer.trim() && !cancelledRef.current) {
          const url = await fetchTTSChunk(ttsBuffer);
          if (url && !cancelledRef.current) enqueueAudio(url);
        }
      },
      onError: (err) => { toast.error(err); setLoading(false); },
      onConversationId: (id) => setActiveConversationId(id),
    });
  };

  /* ── render ──────────────────────────────────────────── */

  return (
    <>
      <style>{`
        @keyframes float-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-animate { animation: float-in 0.25s ease-out; }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
      `}</style>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105"
          >
            <Sparkles className="h-6 w-6" />
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:w-[480px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/50">
          {/* Header */}
          <SheetHeader className="px-5 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showHistory ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowHistory(false)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <SheetTitle className="text-sm font-semibold">
                    {showHistory ? "Chat History" : "EduForYou AI"}
                  </SheetTitle>
                  {!showHistory && (
                    <p className="text-[11px] text-muted-foreground">
                      {mode === "text" && speaking ? "🔊 Speaking…" : mode === "call" ? "Call Mode" : "Available 24/7"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!showHistory && (
                  <>
                    {/* Mode Toggle */}
                    <div className="flex items-center bg-muted/60 rounded-full p-0.5 mr-1">
                      <button
                        onClick={() => setMode("text")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                          mode === "text"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <MessageCircle className="h-3 w-3" />
                        Chat
                      </button>
                      <button
                        onClick={() => setMode("call")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                          mode === "call"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </button>
                    </div>
                    {mode === "text" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowHistory(true)} title="History">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={startNewChat} title="New Chat">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </SheetHeader>

          {showHistory ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2 mb-3 rounded-xl h-11" onClick={startNewChat}>
                  <Plus className="h-4 w-4" /> New Conversation
                </Button>
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm hover:bg-muted/80 transition-all duration-200 border border-transparent ${
                      activeConversationId === conv.id ? "bg-primary/10 border-primary/20 font-medium" : "hover:border-border/50"
                    }`}
                  >
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </p>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-12">No conversations yet</p>
                )}
              </div>
            </ScrollArea>
          ) : mode === "call" ? (
            <ConversationProvider>
              <div>
                <CallModeView />
              </div>
            </ConversationProvider>
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-8">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-base font-semibold">Welcome! 👋</p>
                      <p className="text-sm text-muted-foreground max-w-[280px]">
                        I'm the EduForYou AI assistant. Ask me a question, and I'll respond with text and voice.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center max-w-[340px]">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.prompt}
                          onClick={() => send(action.prompt)}
                          className="px-3 py-1.5 text-xs rounded-full border border-border/60 bg-background hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 text-foreground/80"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 msg-animate ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold">AI</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col gap-0.5 max-w-[80%]">
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted/70 text-foreground border border-border/30 rounded-bl-md"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : msg.content}
                      </div>
                      {msg.timestamp && (
                        <span className={`text-[10px] text-muted-foreground/60 px-1 ${msg.role === "user" ? "text-right" : ""}`}>
                          {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-bold">YOU</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {/* Typing */}
                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-2.5 justify-start msg-animate">
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold">AI</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/70 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                {/* Speaking indicator + Stop */}
                {speaking && (
                  <div className="flex items-center justify-center gap-3 py-2 msg-animate">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                      <span className="text-sm text-primary font-medium">🔊 Speaking…</span>
                      <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={stopAllAudio}>
                        <Square className="h-3 w-3 mr-1" /> Stop
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border/50 px-4 py-3 shrink-0 bg-background/80 backdrop-blur-sm">
                <form
                  onSubmit={(e) => { e.preventDefault(); send(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message…"
                    disabled={loading}
                    className="flex-1 rounded-full pl-4 pr-4 h-11 bg-muted/50 border-border/50 focus-visible:ring-primary/30"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={loading || !input.trim()}
                    className="h-11 w-11 rounded-full shrink-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

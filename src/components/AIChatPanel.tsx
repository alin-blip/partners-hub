import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, Plus, MessageSquare, ChevronLeft, Mic, MicOff, Volume2, VolumeX, Sparkles, Square, Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type Msg = { role: "user" | "assistant"; content: string; timestamp?: Date };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

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

let audioCtx: AudioContext | null = null;
function unlockAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

// Sentence boundary detector for chunked TTS
function extractSentences(text: string): { sentences: string[]; remainder: string } {
  const sentences: string[] = [];
  const regex = /[^.!?\n]+[.!?]+(?:\s|$)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = regex.lastIndex;
  }

  const remainder = text.slice(lastIndex);
  return { sentences, remainder };
}

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

// Fetch TTS for a sentence, return audio blob URL
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

type Conversation = { id: string; title: string; updated_at: string };

const QUICK_ACTIONS = [
  { label: "📋 Commission structure", prompt: "How do agent commissions work?" },
  { label: "🎓 Enrollment process", prompt: "What are the enrollment steps?" },
  { label: "🛂 Visa guidance", prompt: "Explain UK Student Visa requirements" },
  { label: "📊 My students", prompt: "Show me a summary of my students" },
];

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

// Sound wave animation for voice activity
function SoundWave({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-[3px] h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-primary transition-all"
          style={{
            animation: "soundwave 0.8s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
            height: "100%",
          }}
        />
      ))}
    </div>
  );
}

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<string[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const cancelledRef = useRef(false);
  const pendingSubmitRef = useRef(false);
  const voiceModeRef = useRef(false);
  const queryClient = useQueryClient();

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  // ElevenLabs Scribe v2 Realtime
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      if (listening) {
        setInput(data.text);
      }
    },
    onCommittedTranscript: (data) => {
      if (data.text.trim()) {
        setInput(data.text.trim());
        pendingSubmitRef.current = true;
      }
    },
  });

  // Auto-submit when committed transcript arrives
  useEffect(() => {
    if (pendingSubmitRef.current && input.trim() && !loading) {
      pendingSubmitRef.current = false;
      scribe.disconnect();
      setListening(false);
      send();
    }
  }, [input]);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      stopAllAudio();
      if (scribe.isConnected) {
        scribe.disconnect();
      }
    };
  }, []);

  // Restart mic for voice conversation mode
  const restartMicForVoiceMode = useCallback(async () => {
    if (!voiceModeRef.current) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        console.error("Failed to get scribe token for voice mode restart");
        setVoiceMode(false);
        return;
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setListening(true);
    } catch (err) {
      console.error("Voice mode mic restart error:", err);
      setVoiceMode(false);
      setListening(false);
    }
  }, [scribe]);

  // Audio queue player
  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current || cancelledRef.current) return;
    if (audioQueueRef.current.length === 0) {
      setSpeaking(false);
      // Voice mode: auto-restart mic after TTS finishes
      if (voiceModeRef.current) {
        setTimeout(() => {
          if (voiceModeRef.current) {
            restartMicForVoiceMode();
          }
        }, 500);
      }
      return;
    }

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
    } catch {
      // ignore playback errors
    } finally {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      if (!cancelledRef.current) {
        playNextInQueue();
      }
    }
  }, [restartMicForVoiceMode]);

  const enqueueAudio = useCallback((url: string) => {
    audioQueueRef.current.push(url);
    setSpeaking(true);
    if (!isPlayingRef.current) {
      playNextInQueue();
    }
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

  // Start voice conversation mode
  const startVoiceConversation = useCallback(async () => {
    unlockAudio();
    stopAllAudio();
    setAutoSpeak(true);
    setVoiceMode(true);

    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        toast.error("Nu s-a putut porni conversația vocală.");
        setVoiceMode(false);
        return;
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setListening(true);
      setInput("");
    } catch (err) {
      console.error("Voice conversation start error:", err);
      toast.error("Eroare la pornirea conversației vocale.");
      setVoiceMode(false);
    }
  }, [scribe, stopAllAudio]);

  // Stop voice conversation mode
  const stopVoiceConversation = useCallback(() => {
    setVoiceMode(false);
    if (scribe.isConnected) {
      scribe.disconnect();
    }
    setListening(false);
    stopAllAudio();
  }, [scribe, stopAllAudio]);

  const toggleListening = useCallback(async () => {
    // If in voice mode and user clicks mic, exit voice mode
    if (voiceMode) {
      stopVoiceConversation();
      return;
    }

    if (listening || scribe.isConnected) {
      scribe.disconnect();
      setListening(false);
      return;
    }

    stopAllAudio();

    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        toast.error("Nu s-a putut obține tokenul pentru recunoaștere vocală.");
        return;
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setListening(true);
      setInput("");
    } catch (err) {
      console.error("Scribe connect error:", err);
      toast.error("Eroare la pornirea microfonului. Verifică permisiunile.");
    }
  }, [listening, scribe, stopAllAudio, voiceMode, stopVoiceConversation]);

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
    if (voiceMode) stopVoiceConversation();
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    unlockAudio();
    cancelledRef.current = false;

    // If user typed manually while in voice mode, exit voice mode
    const isFromKeyboard = !pendingSubmitRef.current && !overrideText;
    if (isFromKeyboard && voiceMode) {
      stopVoiceConversation();
    }

    const userMsg: Msg = { role: "user", content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    stopAllAudio();

    let assistantSoFar = "";
    let ttsBuffer = "";
    let sentencesSent = 0;

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar, timestamp: new Date() }];
      });

      // Sentence-chunked TTS: detect sentences and send to TTS immediately
      if (autoSpeak && !cancelledRef.current) {
        ttsBuffer += chunk;
        const { sentences, remainder } = extractSentences(ttsBuffer);
        if (sentences.length > 0) {
          for (const sentence of sentences) {
            sentencesSent++;
            fetchTTSChunk(sentence).then((url) => {
              if (url && !cancelledRef.current) {
                enqueueAudio(url);
              }
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

        // Send remaining buffer as final TTS chunk
        if (autoSpeak && ttsBuffer.trim() && !cancelledRef.current) {
          const url = await fetchTTSChunk(ttsBuffer);
          if (url && !cancelledRef.current) {
            enqueueAudio(url);
          }
        }
      },
      onError: (err) => {
        toast.error(err);
        setLoading(false);
        // If in voice mode, restart mic even on error so user can try again
        if (voiceModeRef.current) {
          setTimeout(() => restartMicForVoiceMode(), 500);
        }
      },
      onConversationId: (id) => setActiveConversationId(id),
    });
  };

  return (
    <>
      {/* Soundwave CSS animation */}
      <style>{`
        @keyframes soundwave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        @keyframes float-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-animate {
          animation: float-in 0.25s ease-out;
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
          70% { box-shadow: 0 0 0 10px hsl(var(--primary) / 0); }
          100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
        }
        .mic-pulse {
          animation: pulse-ring 1.5s infinite;
        }
        @keyframes voice-glow {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--destructive) / 0.3); }
          50% { box-shadow: 0 0 0 8px hsl(var(--destructive) / 0); }
        }
        .voice-mode-pulse {
          animation: voice-glow 2s ease-in-out infinite;
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
          {/* Glassmorphic Header */}
          <SheetHeader className="px-5 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showHistory ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowHistory(false)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${voiceMode ? "bg-destructive animate-pulse" : "bg-emerald-500"}`} />
                  </div>
                )}
                <div>
                  <SheetTitle className="text-sm font-semibold">
                    {showHistory ? "Istoric Conversații" : "EduForYou AI"}
                  </SheetTitle>
                  {!showHistory && (
                    <p className="text-[11px] text-muted-foreground">
                      {voiceMode ? "Conversație vocală activă" : "Powered by AI • Disponibil 24/7"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!showHistory && (
                  <>
                    {/* Voice Conversation Toggle */}
                    <Button
                      variant={voiceMode ? "destructive" : "ghost"}
                      size="icon"
                      className={`h-8 w-8 rounded-full ${voiceMode ? "voice-mode-pulse" : ""}`}
                      onClick={voiceMode ? stopVoiceConversation : startVoiceConversation}
                      title={voiceMode ? "Oprește conversația vocală" : "Pornește conversație vocală"}
                      disabled={loading}
                    >
                      {voiceMode ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setAutoSpeak(!autoSpeak)}
                      title={autoSpeak ? "Dezactivează vocea" : "Activează vocea"}
                    >
                      {autoSpeak ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowHistory(true)} title="Istoric">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={startNewChat} title="Chat Nou">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetHeader>

          {showHistory ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2 mb-3 rounded-xl h-11" onClick={startNewChat}>
                  <Plus className="h-4 w-4" /> Conversație Nouă
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
                  <p className="text-sm text-muted-foreground text-center py-12">Nicio conversație încă</p>
                )}
              </div>
            </ScrollArea>
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
                      <p className="text-base font-semibold">Bun venit! 👋</p>
                      <p className="text-sm text-muted-foreground max-w-[280px]">
                        Sunt asistentul AI EduForYou. Întreabă-mă orice despre înrolări, comisioane sau ghidaj UK.
                      </p>
                    </div>
                    {/* Quick Action Chips */}
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
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold">
                          AI
                        </AvatarFallback>
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
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.timestamp && (
                        <span className={`text-[10px] text-muted-foreground/60 px-1 ${msg.role === "user" ? "text-right" : ""}`}>
                          {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-bold">
                          TU
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {/* Typing Indicator */}
                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-2.5 justify-start msg-animate">
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[10px] font-bold">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/70 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                {/* Listening indicator */}
                {listening && !voiceMode && (
                  <div className="flex items-center justify-center gap-3 py-4 msg-animate">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-destructive/10 border border-destructive/20">
                      <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm text-destructive font-medium">Ascultă…</span>
                      <SoundWave active={true} />
                      <Button variant="destructive" size="sm" className="h-7 rounded-full text-xs" onClick={toggleListening}>
                        <MicOff className="h-3.5 w-3.5 mr-1" /> Stop
                      </Button>
                    </div>
                  </div>
                )}
                {/* Speaking indicator */}
                {speaking && (
                  <div className="flex items-center justify-center gap-3 py-2 msg-animate">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                      <SoundWave active={true} />
                      <span className="text-sm text-primary font-medium">Vorbește…</span>
                      <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={stopAllAudio}>
                        <Square className="h-3 w-3 mr-1" /> Stop
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <div className="border-t border-border/50 px-4 py-3 shrink-0 bg-background/80 backdrop-blur-sm">
                {voiceMode ? (
                  /* Voice conversation mode input bar */
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-destructive/10 border border-destructive/20 flex-1 justify-center">
                      {listening && !loading && (
                        <>
                          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                          <SoundWave active={true} />
                          <span className="text-sm font-medium text-destructive">
                            {input ? input : "Te ascultă…"}
                          </span>
                        </>
                      )}
                      {loading && (
                        <span className="text-sm font-medium text-muted-foreground">Se procesează…</span>
                      )}
                      {speaking && !loading && !listening && (
                        <>
                          <SoundWave active={true} />
                          <span className="text-sm font-medium text-primary">AI vorbește…</span>
                        </>
                      )}
                      {!listening && !loading && !speaking && (
                        <span className="text-sm font-medium text-muted-foreground">Se reconectează…</span>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-11 w-11 rounded-full shrink-0 voice-mode-pulse"
                      onClick={stopVoiceConversation}
                      title="Oprește conversația vocală"
                    >
                      <PhoneOff className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  /* Normal text input bar */
                  <form
                    id="ai-chat-form"
                    onSubmit={(e) => { e.preventDefault(); send(); }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1 relative">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={listening ? "Ascultă…" : "Scrie un mesaj…"}
                        disabled={loading}
                        className="rounded-full pl-4 pr-4 h-11 bg-muted/50 border-border/50 focus-visible:ring-primary/30"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant={listening ? "destructive" : "ghost"}
                      className={`h-11 w-11 rounded-full shrink-0 ${listening ? "mic-pulse" : "hover:bg-primary/10"}`}
                      onClick={toggleListening}
                      title={listening ? "Oprește ascultarea" : "Pornește microfonul"}
                      disabled={loading}
                    >
                      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={loading || !input.trim()}
                      className="h-11 w-11 rounded-full shrink-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

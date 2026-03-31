import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Plus, MessageSquare, ChevronLeft, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

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

async function playTTS(text: string): Promise<HTMLAudioElement | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: text.slice(0, 3000) }),
    });

    if (!response.ok) {
      console.error("TTS failed:", response.status);
      return null;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
    return audio;
  } catch (err) {
    console.error("TTS playback error:", err);
    return null;
  }
}

type Conversation = { id: string; title: string; updated_at: string };

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSubmitRef = useRef(false);
  const queryClient = useQueryClient();

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
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (scribe.isConnected) {
        scribe.disconnect();
      }
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setSpeaking(false);
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (listening || scribe.isConnected) {
      scribe.disconnect();
      setListening(false);
      return;
    }

    stopAudio();

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
  }, [listening, scribe, stopAudio]);

  const loadConversation = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    }
    setActiveConversationId(convId);
    setShowHistory(false);
  }, []);

  const startNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setShowHistory(false);
    stopAudio();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    stopAudio();

    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamChat({
      messages: newMessages,
      conversationId: activeConversationId,
      onDelta: upsert,
      onDone: async () => {
        setLoading(false);
        queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
        
        if (autoSpeak && assistantSoFar.trim()) {
          setSpeaking(true);
          const audio = await playTTS(assistantSoFar);
          if (audio) {
            currentAudioRef.current = audio;
            audio.onended = () => {
              setSpeaking(false);
              currentAudioRef.current = null;
            };
          } else {
            setSpeaking(false);
          }
        }
      },
      onError: (err) => {
        toast.error(err);
        setLoading(false);
      },
      onConversationId: (id) => setActiveConversationId(id),
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        >
          <Bot className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[460px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showHistory ? (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Bot className="h-5 w-5 text-primary" />
              )}
              <SheetTitle className="text-base">
                {showHistory ? "Chat History" : "EduForYou AI Assistant"}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              {!showHistory && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    title={autoSpeak ? "Dezactivează vocea" : "Activează vocea"}
                  >
                    {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(true)} title="History">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startNewChat} title="New Chat">
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        {showHistory ? (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              <Button variant="outline" className="w-full justify-start gap-2 mb-2" onClick={startNewChat}>
                <Plus className="h-4 w-4" /> New Conversation
              </Button>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${
                    activeConversationId === conv.id ? "bg-muted font-medium" : ""
                  }`}
                >
                  <p className="truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                  </p>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
              )}
            </div>
          </ScrollArea>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 py-12">
                  <Bot className="h-10 w-10 opacity-30" />
                  <div>
                    <p className="text-sm font-medium">Hi! I'm the EduForYou AI Assistant.</p>
                    <p className="text-xs mt-1">Ask me about enrollment processes, commissions, visa guidance, or anything about the platform.</p>
                    <p className="text-xs mt-2 text-primary/70">🎙️ Apasă microfonul pentru a vorbi</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
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
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              {listening && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Te ascultă…</span>
                  <Button variant="destructive" size="sm" onClick={toggleListening}>
                    <MicOff className="h-4 w-4 mr-1" /> Oprește
                  </Button>
                </div>
              )}
              {speaking && (
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-muted-foreground">AI vorbește…</span>
                  <Button variant="outline" size="sm" onClick={stopAudio}>
                    <VolumeX className="h-4 w-4 mr-1" /> Stop
                  </Button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t px-4 py-3 shrink-0">
              <form
                id="ai-chat-form"
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={listening ? "Ascultă…" : "Type your question…"}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant={listening ? "destructive" : "outline"}
                  onClick={toggleListening}
                  title={listening ? "Oprește ascultarea" : "Pornește microfonul"}
                  disabled={loading}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

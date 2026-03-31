import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Plus, MessageSquare, ChevronLeft, Mic, MicOff, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useConversation } from "@elevenlabs/react";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

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

  // Get conversation ID from response header
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

type Conversation = { id: string; title: string; updated_at: string };

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const conversation = useConversation({
    onConnect: () => {
      setVoiceActive(true);
      toast.success("Conversație vocală activă");
    },
    onDisconnect: () => {
      setVoiceActive(false);
    },
    onError: (error) => {
      console.error("Voice error:", error);
      toast.error("Eroare la conexiunea vocală");
      setVoiceActive(false);
    },
  });

  const toggleVoice = useCallback(async () => {
    if (voiceActive) {
      await conversation.endSession();
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: "agent_4501kmytq1bnekgs59jh6rzjwxw4",
      });
    } catch (err) {
      toast.error("Permite accesul la microfon pentru a folosi vocea.");
    }
  }, [voiceActive, conversation]);

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
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

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
      onDone: () => {
        setLoading(false);
        queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
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
              {voiceActive && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className={`h-3 w-3 rounded-full ${conversation.isSpeaking ? "bg-primary animate-pulse" : "bg-green-500 animate-pulse"}`} />
                  <span className="text-sm text-muted-foreground">
                    {conversation.isSpeaking ? "AI vorbește…" : "Te ascultă…"}
                  </span>
                  <Button variant="destructive" size="sm" onClick={toggleVoice}>
                    <MicOff className="h-4 w-4 mr-1" /> Oprește
                  </Button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t px-4 py-3 shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question…"
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant={voiceActive ? "destructive" : "outline"}
                  onClick={toggleVoice}
                  title={voiceActive ? "Oprește vocea" : "Pornește vocea"}
                >
                  {voiceActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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

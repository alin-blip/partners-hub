import { useState, useRef, useEffect } from "react";
import { compositeFullBranding } from "@/lib/image-composite";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import {
  Image as ImageIcon,
  Square,
  Smartphone,
  FileText,
  LayoutTemplate,
  Download,
  Loader2,
  Sparkles,
  User,
  MessageSquare,
  Copy,
  Check,
  Send,
  Settings2,
  ChevronDown,
  Bot,
} from "lucide-react";
import { format } from "date-fns";

const LANGUAGES = [
  { value: "Romanian", label: "🇷🇴 Română" },
  { value: "English", label: "🇬🇧 English" },
  { value: "Arabic", label: "🇸🇦 العربية" },
  { value: "French", label: "🇫🇷 Français" },
  { value: "Spanish", label: "🇪🇸 Español" },
  { value: "Hindi", label: "🇮🇳 हिन्दी" },
];

const PRESETS = [
  { id: "social_post", label: "Social Post", desc: "1080×1080", icon: Square },
  { id: "story", label: "Story", desc: "1080×1920", icon: Smartphone },
  { id: "flyer", label: "Flyer", desc: "A5", icon: FileText },
  { id: "banner", label: "Banner", desc: "1200×628", icon: LayoutTemplate },
];

const getGenerationErrorMessage = (errorType?: string, error?: string) => {
  if (errorType === "daily_limit" || error?.includes("Daily limit")) return "Daily limit reached";
  if (errorType === "credits_exhausted") return "AI credits exhausted — please contact admin";
  if (errorType === "rate_limit") return "AI is busy right now. Retrying automatically...";
  return error || "Generation failed. Please try again later.";
};

const PROGRESS_STEPS = [
  "✍️ Writing marketing copy...",
  "🎨 Generating image...",
  "🖼️ Applying branding...",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  generatedText?: { headline: string; subheadline: string; bullets: string[] };
  timestamp: Date;
  saved?: boolean;
};

export default function CreateImagePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState("social_post");
  const [inputValue, setInputValue] = useState("");
  const [includePhoto, setIncludePhoto] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [captionLanguage, setCaptionLanguage] = useState("Romanian");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Course context
  const [selectedUniId, setSelectedUniId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Cooldown
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const startCooldown = (seconds: number) => {
    const until = Date.now() + seconds * 1000;
    setCooldownUntil(until);
    setCooldownSeconds(seconds);
    const interval = setInterval(() => {
      const left = Math.ceil((until - Date.now()) / 1000);
      if (left <= 0) {
        setCooldownUntil(null);
        setCooldownSeconds(0);
        clearInterval(interval);
      } else {
        setCooldownSeconds(left);
      }
    }, 1000);
  };

  const isCoolingDown = cooldownUntil !== null && Date.now() < cooldownUntil;
  const hasAvatar = !!(profile as any)?.avatar_url;

  const { data: universities = [] } = useQuery({
    queryKey: ["universities-active"],
    queryFn: async () => {
      const { data } = await supabase.from("universities").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-active"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, level, study_mode, university_id").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const filteredCourses = selectedUniId ? courses.filter((c: any) => c.university_id === selectedUniId) : courses;

  const { data: cardSettings } = useQuery({
    queryKey: ["my-card-settings", user?.id],
    queryFn: async () => {
      const { data: card } = await supabase.from("agent_card_settings").select("is_public").eq("user_id", user!.id).maybeSingle();
      const { data: prof } = await supabase.from("profiles").select("slug").eq("id", user!.id).single();
      return { is_public: card?.is_public || false, slug: prof?.slug || null };
    },
    enabled: !!user,
  });

  const hasCard = cardSettings?.is_public && cardSettings?.slug;
  const cardUrl = hasCard ? `${window.location.origin}/card/${cardSettings.slug}` : null;

  const { data: gallery = [], isLoading: galleryLoading } = useQuery({
    queryKey: ["my-generated-images"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_images" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get the last generated image URL for edit mode
  const getLastImageUrl = (): string | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].imageUrl) {
        return messages[i].imageUrl!;
      }
    }
    return null;
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || inputValue).trim();
    if (!text || isGenerating) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsGenerating(true);
    setSettingsOpen(false);
    setProgressStep(0);

    // Progress step animation
    const progressInterval = setInterval(() => {
      setProgressStep((prev) => Math.min(prev + 1, PROGRESS_STEPS.length - 1));
    }, 8000);

    const attemptGeneration = async (retryCount = 0): Promise<void> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const lastImageUrl = getLastImageUrl();
        const isEdit = !!lastImageUrl;

        if (isEdit) setProgressStep(1); // skip copy step for edits

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              prompt: isEdit ? messages[0]?.content || text : text,
              preset: selectedPreset,
              includePhoto,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              language: captionLanguage,
              ...(selectedCourseId ? { courseId: selectedCourseId } : {}),
              ...(isEdit ? { previousImageUrl: lastImageUrl, editInstruction: text } : {}),
            }),
          }
        );

        const result = await resp.json();
        if (!resp.ok || result?.ok === false) {
          const errorType = result?.errorType;
          // Auto-retry on rate limit
          if (errorType === "rate_limit" && retryCount < 2) {
            const retryAfter = result?.retryAfter || 15;
            startCooldown(retryAfter);
            // Show retry message
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `⏳ AI is busy. Retrying automatically in ${retryAfter}s...`,
                timestamp: new Date(),
              },
            ]);
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            return attemptGeneration(retryCount + 1);
          }
          throw new Error(getGenerationErrorMessage(errorType, result?.error));
        }

        // Client-side branding
        setProgressStep(2);
        let finalUrl = result.url;
        const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/brand-assets/eduforyou-logo.png`;
        finalUrl = await compositeFullBranding(result.url, logoUrl, result.avatarUrl || null, selectedPreset, !!includePhoto);

        if (result.remaining !== undefined) setRemaining(result.remaining);
        qc.invalidateQueries({ queryKey: ["my-generated-images"] });

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isEdit
            ? "Here's the updated image! Would you like to **save it** or tell me what else to change?"
            : "Here's your image! Would you like to **save it** or tell me what to change?",
          imageUrl: finalUrl,
          generatedText: result.generatedText,
          timestamp: new Date(),
          saved: false,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e: any) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ ${e.message}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    };

    try {
      await attemptGeneration();
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgressStep(0);
      inputRef.current?.focus();
    }
  };

  const handleSaveImage = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, saved: true } : m))
    );
    toast({ title: "✅ Image saved!", description: "You can find it in your gallery below." });
  };

  const handleModifyImage = () => {
    inputRef.current?.focus();
  };

  const handleCopyCaption = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCaption(text);
    setTimeout(() => setCopiedCaption(null), 2000);
  };

  const handleNewConversation = () => {
    setMessages([]);
    setSettingsOpen(true);
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("generated-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const lastImageMsg = [...messages].reverse().find((m) => m.role === "assistant" && m.imageUrl);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent" />
              AI Image Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Chat with AI to create and refine marketing images
            </p>
          </div>
          <div className="flex items-center gap-2">
            {remaining !== null && (
              <Badge variant="secondary" className="text-sm">
                {remaining}/5 remaining
              </Badge>
            )}
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleNewConversation}>
                New Image
              </Button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Image Settings
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Preset selector */}
                <div>
                  <Label className="text-sm mb-2 block">Format</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all text-sm ${
                          selectedPreset === p.id
                            ? "ring-2 ring-accent border-accent bg-accent/5"
                            : "hover:border-accent/50"
                        }`}
                        onClick={() => setSelectedPreset(p.id)}
                      >
                        <p.icon className={`w-4 h-4 flex-shrink-0 ${selectedPreset === p.id ? "text-accent" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium text-xs">{p.label}</p>
                          <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Course context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Institution (optional)</Label>
                    <Select value={selectedUniId} onValueChange={(v) => { setSelectedUniId(v === "__clear__" ? "" : v); setSelectedCourseId(""); }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__clear__">All institutions</SelectItem>
                        {universities.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Course (optional)</Label>
                    <Select value={selectedCourseId} onValueChange={(v) => setSelectedCourseId(v === "__clear__" ? "" : v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="No course" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__clear__">No course</SelectItem>
                        {filteredCourses.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.level})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Options row */}
                <div className="flex items-center gap-4 flex-wrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <Switch checked={includePhoto} onCheckedChange={setIncludePhoto} disabled={!hasAvatar} />
                        <Label className="flex items-center gap-1 cursor-pointer text-sm">
                          <User className="w-3.5 h-3.5" />
                          Include my photo
                        </Label>
                      </div>
                    </TooltipTrigger>
                    {!hasAvatar && (
                      <TooltipContent>Upload your photo in Profile first</TooltipContent>
                    )}
                  </Tooltip>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Language:</Label>
                    <Select value={captionLanguage} onValueChange={setCaptionLanguage}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Chat Area */}
        <Card className="flex flex-col" style={{ minHeight: messages.length > 0 ? "500px" : "200px" }}>
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="font-semibold text-lg mb-1">Start creating</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Describe what you want — e.g. "A post about studying Business in London" — and I'll create a branded marketing image. You can then refine it through conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                      {msg.imageUrl && (
                        <div className="mt-3">
                          <img
                            src={msg.imageUrl}
                            alt="Generated"
                            className="rounded-lg max-w-full shadow-md"
                          />
                          {/* Save / Modify quick actions */}
                          {!msg.saved && (
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-accent text-accent-foreground hover:bg-accent/90"
                                onClick={() => handleSaveImage(msg.id)}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" /> Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleModifyImage}
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Modify
                              </Button>
                            </div>
                          )}
                          {msg.saved && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-2">✅ Saved! Share it:</p>
                              <SocialShareButtons
                                imageUrl={msg.imageUrl}
                                caption=""
                                cardUrl={cardUrl}
                                filenamePrefix="eduforyou-generated"
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {msg.generatedText && (
                        <div className="mt-2 p-2 rounded-md bg-background/60 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-muted-foreground">Generated text:</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2"
                              onClick={() => {
                                const text = `${msg.generatedText!.headline}\n${msg.generatedText!.subheadline}${msg.generatedText!.bullets.length > 0 ? "\n" + msg.generatedText!.bullets.map(b => `• ${b}`).join("\n") : ""}`;
                                handleCopyCaption(text);
                              }}
                            >
                              {copiedCaption ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                          <p className="font-semibold">{msg.generatedText.headline}</p>
                          <p>{msg.generatedText.subheadline}</p>
                          {msg.generatedText.bullets.length > 0 && (
                            <ul className="list-disc pl-4">
                              {msg.generatedText.bullets.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] mt-1 opacity-50">
                        {format(msg.timestamp, "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="space-y-1.5">
                        {PROGRESS_STEPS.map((step, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-sm transition-opacity ${
                              i <= progressStep ? "opacity-100" : "opacity-30"
                            }`}
                          >
                            {i < progressStep ? (
                              <Check className="w-3.5 h-3.5 text-accent" />
                            ) : i === progressStep ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30" />
                            )}
                            <span className={i === progressStep ? "text-foreground" : "text-muted-foreground"}>
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input bar */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  messages.length === 0
                    ? "Describe the image you want..."
                    : "Ask for changes — e.g. 'make the background darker'..."
                }
                disabled={isGenerating || isCoolingDown}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isGenerating || !inputValue.trim() || isCoolingDown}
                className="bg-accent text-accent-foreground hover:bg-accent/90 flex-shrink-0"
              >
                {isCoolingDown ? (
                  <span className="text-[10px]">{cooldownSeconds}s</span>
                ) : isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>

        {/* Gallery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              My Gallery
            </CardTitle>
            <CardDescription>Previously generated images</CardDescription>
          </CardHeader>
          <CardContent>
            {galleryLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : gallery.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No images generated yet. Start a conversation above!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.map((img: any) => (
                  <div key={img.id} className="rounded-lg overflow-hidden border">
                    <div className="relative group">
                      <img
                        src={getPublicUrl(img.image_path)}
                        alt={img.prompt}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-white text-xs line-clamp-2">{img.prompt}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="secondary" className="text-[10px]">{img.preset}</Badge>
                          <span className="text-[10px] text-white/70">{format(new Date(img.created_at), "dd MMM")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 flex justify-center">
                      <SocialShareButtons
                        imageUrl={getPublicUrl(img.image_path)}
                        caption=""
                        cardUrl={cardUrl}
                        filenamePrefix={`eduforyou-${img.id.slice(0, 8)}`}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

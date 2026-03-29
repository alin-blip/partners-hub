import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Send,
  Upload,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Square,
  Smartphone,
  FileText,
  LayoutTemplate,
  Sparkles,
  User,
  MessageSquare,
  Copy,
  Check,
  Download,
} from "lucide-react";

const LANGUAGES = [
  { value: "Romanian", label: "🇷🇴 Română" },
  { value: "English", label: "🇬🇧 English" },
  { value: "Arabic", label: "🇸🇦 العربية" },
  { value: "French", label: "🇫🇷 Français" },
  { value: "Spanish", label: "🇪🇸 Español" },
  { value: "Hindi", label: "🇮🇳 हिन्दी" },
];

const PRESETS = [
  { id: "social_post", label: "Social Media Post", desc: "1080×1080 square", icon: Square },
  { id: "story", label: "Story", desc: "1080×1920 vertical", icon: Smartphone },
  { id: "flyer", label: "Flyer", desc: "A5 portrait", icon: FileText },
  { id: "banner", label: "Banner", desc: "1200×628 horizontal", icon: LayoutTemplate },
];

function CaptionDisplay({ caption }: { caption: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          Generated Caption
        </Label>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCopy}>
          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap border">{caption}</div>
    </div>
  );
}

export default function SocialPostsPage() {
  const { user, role, profile } = useAuth();
  const qc = useQueryClient();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  // --- Image source tab ---
  const [imageSource, setImageSource] = useState<"ai" | "upload">("ai");

  // --- AI generation state ---
  const [selectedPreset, setSelectedPreset] = useState("social_post");
  const [prompt, setPrompt] = useState("");
  const [includePhoto, setIncludePhoto] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [captionLanguage, setCaptionLanguage] = useState("Romanian");
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [captionLoading, setCaptionLoading] = useState(false);
  const hasAvatar = !!(profile as any)?.avatar_url;

  // --- Manual upload state ---
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // --- Publish state ---
  const [caption, setCaption] = useState("");
  const [targetMode, setTargetMode] = useState<"all" | "team" | "select">("all");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Determine which image URL we have
  const hasImage = imageSource === "ai" ? !!generatedUrl : !!imageFile;
  const previewImage = imageSource === "ai" ? generatedUrl : imagePreview;

  // --- Queries ---
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-for-posts", role],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, full_name, email, admin_id");
      if (role === "admin") {
        query = query.eq("admin_id", user!.id);
      }
      const { data, error } = await query.order("full_name");
      if (error) throw error;
      return (data || []).filter((p: any) => p.id !== user?.id);
    },
    enabled: isOwnerOrAdmin && !!user,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["social-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // --- AI Generate Image ---
  const [generating, setGenerating] = useState(false);
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prompt,
            preset: selectedPreset,
            includePhoto,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Generation failed");
      setGeneratedUrl(result.url);
      setRemaining(result.remaining);
      toast.success("Image generated!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // --- AI Generate Caption ---
  const handleGenerateCaption = async () => {
    setCaptionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-caption`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ prompt, preset: selectedPreset, language: captionLanguage }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Caption generation failed");
      setAiCaption(result.caption);
      setCaption(result.caption);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCaptionLoading(false);
    }
  };

  // --- Manual upload ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // --- Publish ---
  const handlePublish = async () => {
    if (!hasImage || !caption.trim()) {
      toast.error("Please add an image and caption");
      return;
    }
    setPublishing(true);
    try {
      let finalImageUrl: string;

      if (imageSource === "ai" && generatedUrl) {
        finalImageUrl = generatedUrl;
      } else if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const filePath = `social-posts/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("generated-images")
          .upload(filePath, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("generated-images")
          .getPublicUrl(filePath);
        finalImageUrl = urlData.publicUrl;
      } else {
        throw new Error("No image available");
      }

      const { data: post, error: postErr } = await supabase
        .from("social_posts")
        .insert({
          created_by: user!.id,
          image_url: finalImageUrl,
          caption: caption.trim(),
          target_role: targetMode,
        })
        .select()
        .single();
      if (postErr) throw postErr;

      let recipientIds: string[] = [];
      if (targetMode === "all") {
        recipientIds = agents.map((a: any) => a.id);
      } else if (targetMode === "team") {
        recipientIds = agents.filter((a: any) => a.admin_id === user!.id).map((a: any) => a.id);
      } else {
        recipientIds = selectedAgents;
      }

      if (recipientIds.length > 0) {
        const recipientRows = recipientIds.map((agentId) => ({
          post_id: post.id,
          agent_id: agentId,
        }));
        const { error: recErr } = await supabase
          .from("social_post_recipients")
          .insert(recipientRows);
        if (recErr) throw recErr;
      }

      toast.success(`Post published to ${recipientIds.length} recipient(s)`);
      // Reset
      setCaption("");
      setImageFile(null);
      setImagePreview(null);
      setGeneratedUrl(null);
      setAiCaption(null);
      setPrompt("");
      setSelectedAgents([]);
      qc.invalidateQueries({ queryKey: ["social-posts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("social_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["social-posts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!isOwnerOrAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">
          You don't have access to create social posts.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent" />
              Social Posts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and send marketing content to your agents
            </p>
          </div>
          {remaining !== null && (
            <Badge variant="secondary" className="text-sm">
              {remaining}/5 AI images remaining today
            </Badge>
          )}
        </div>

        {/* Step 1: Image Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1 — Create Image</CardTitle>
            <CardDescription>Generate with AI or upload manually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={imageSource} onValueChange={(v) => setImageSource(v as "ai" | "upload")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai" className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  AI Generate
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  Upload
                </TabsTrigger>
              </TabsList>

              {/* AI Tab */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                {/* Preset selector */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PRESETS.map((p) => (
                    <Card
                      key={p.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPreset === p.id
                          ? "ring-2 ring-accent border-accent"
                          : "hover:border-accent/50"
                      }`}
                      onClick={() => setSelectedPreset(p.id)}
                    >
                      <CardContent className="p-3 text-center">
                        <p.icon className={`w-6 h-6 mx-auto mb-1 ${selectedPreset === p.id ? "text-accent" : "text-muted-foreground"}`} />
                        <p className="font-medium text-xs">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Prompt */}
                <div className="space-y-2">
                  <Label>What should the image show?</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. A vibrant promotional post about studying in London with scholarship opportunities..."
                    rows={3}
                  />
                </div>

                {/* Options row */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={includePhoto}
                            onCheckedChange={setIncludePhoto}
                            disabled={!hasAvatar}
                          />
                          <Label className="flex items-center gap-1 cursor-pointer text-sm">
                            <User className="w-4 h-4" />
                            Include my photo
                          </Label>
                        </div>
                      </TooltipTrigger>
                      {!hasAvatar && (
                        <TooltipContent>Upload your photo in Profile first</TooltipContent>
                      )}
                    </Tooltip>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Caption language:</Label>
                      <Select value={captionLanguage} onValueChange={setCaptionLanguage}>
                        <SelectTrigger className="w-[140px] h-9">
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

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {generating ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-1" />Generate Image</>
                    )}
                  </Button>
                </div>

                {/* Generated result */}
                {generatedUrl && (
                  <div className="space-y-3">
                    <div className="relative group">
                      <img
                        src={generatedUrl}
                        alt="Generated"
                        className="w-full max-w-lg mx-auto rounded-lg shadow-md"
                      />
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              onClick={handleGenerateCaption}
                              disabled={captionLoading}
                            >
                              {captionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MessageSquare className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Generate caption</TooltipContent>
                        </Tooltip>
                        <a href={generatedUrl} download target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="secondary">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                    {aiCaption && <CaptionDisplay caption={aiCaption} />}
                  </div>
                )}
              </TabsContent>

              {/* Upload Tab */}
              <TabsContent value="upload" className="space-y-4 mt-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-64 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Step 2: Caption & Publish */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2 — Caption & Publish</CardTitle>
            <CardDescription>
              {hasImage
                ? "Add a caption and choose recipients"
                : "Generate or upload an image first"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview thumbnail */}
            {previewImage && (
              <img
                src={previewImage}
                alt="Selected"
                className="w-full max-h-48 object-cover rounded-lg border"
              />
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for your post…"
                rows={3}
              />
            </div>

            {/* Target selector */}
            <div className="space-y-2">
              <Label>Send to</Label>
              <Select value={targetMode} onValueChange={(v: any) => setTargetMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {role === "admin" && <SelectItem value="team">My team</SelectItem>}
                  <SelectItem value="select">Select individually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetMode === "select" && (
              <ScrollArea className="max-h-48 border rounded-lg p-3">
                <div className="space-y-2">
                  {agents.map((agent: any) => (
                    <label key={agent.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={(checked) => {
                          setSelectedAgents(checked
                            ? [...selectedAgents, agent.id]
                            : selectedAgents.filter((id) => id !== agent.id)
                          );
                        }}
                      />
                      <span className="text-sm">{agent.full_name}</span>
                      <span className="text-xs text-muted-foreground">{agent.email}</span>
                    </label>
                  ))}
                  {agents.length === 0 && (
                    <p className="text-sm text-muted-foreground">No agents found</p>
                  )}
                </div>
              </ScrollArea>
            )}

            <Button
              onClick={handlePublish}
              disabled={publishing || !hasImage || !caption.trim()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {publishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              {publishing ? "Publishing…" : "Publish Post"}
            </Button>
          </CardContent>
        </Card>

        {/* Published Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Published Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No posts yet</p>
            ) : (
              <div className="space-y-3">
                {posts.map((post: any) => (
                  <div key={post.id} className="flex gap-4 p-3 rounded-lg border">
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap line-clamp-3">{post.caption}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.created_at), "dd MMM yyyy HH:mm")}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {post.target_role === "all" ? "All agents" : post.target_role}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

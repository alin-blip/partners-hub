import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import { format } from "date-fns";

const PRESETS = [
  { id: "social_post", label: "Social Media Post", desc: "1080×1080 square", icon: Square },
  { id: "story", label: "Story", desc: "1080×1920 vertical", icon: Smartphone },
  { id: "flyer", label: "Flyer", desc: "A5 portrait", icon: FileText },
  { id: "banner", label: "Banner", desc: "1200×628 horizontal", icon: LayoutTemplate },
];

function CaptionDisplay({ caption, onClose }: { caption: string; onClose: () => void }) {
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
      <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap border">
        {caption}
      </div>
    </div>
  );
}

export default function CreateImagePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState("social_post");
  const [prompt, setPrompt] = useState("");
  const [includePhoto, setIncludePhoto] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [captionLoading, setCaptionLoading] = useState<Record<string, boolean>>({});

  const hasAvatar = !!(profile as any)?.avatar_url;

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

  const generate = useMutation({
    mutationFn: async () => {
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
          body: JSON.stringify({ prompt, preset: selectedPreset, includePhoto }),
        }
      );

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Generation failed");
      return result;
    },
    onSuccess: (data) => {
      setGeneratedUrl(data.url);
      setRemaining(data.remaining);
      qc.invalidateQueries({ queryKey: ["my-generated-images"] });
      toast({ title: "Image generated!" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const generateCaption = async (key: string, imgPrompt: string, imgPreset: string) => {
    setCaptionLoading((prev) => ({ ...prev, [key]: true }));
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
          body: JSON.stringify({ prompt: imgPrompt, preset: imgPreset }),
        }
      );

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Caption generation failed");
      setCaptions((prev) => ({ ...prev, [key]: result.caption }));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCaptionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("generated-images").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent" />
              AI Image Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create branded marketing images with AI
            </p>
          </div>
          {remaining !== null && (
            <Badge variant="secondary" className="text-sm">
              {remaining}/5 remaining today
            </Badge>
          )}
        </div>

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
              <CardContent className="p-4 text-center">
                <p.icon className={`w-8 h-8 mx-auto mb-2 ${selectedPreset === p.id ? "text-accent" : "text-muted-foreground"}`} />
                <p className="font-medium text-sm">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Prompt & Options */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>What should the image show?</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A vibrant promotional post about studying in London with scholarship opportunities..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={includePhoto}
                        onCheckedChange={setIncludePhoto}
                        disabled={!hasAvatar}
                      />
                      <Label className="flex items-center gap-1 cursor-pointer">
                        <User className="w-4 h-4" />
                        Include my photo
                      </Label>
                    </div>
                  </TooltipTrigger>
                  {!hasAvatar && (
                    <TooltipContent>
                      Upload your photo in Profile first
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>

              <Button
                onClick={() => generate.mutate()}
                disabled={generate.isPending || !prompt.trim()}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Result */}
        {generatedUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated Image</CardTitle>
            </CardHeader>
            <CardContent>
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
                        onClick={() => generateCaption("latest", prompt, selectedPreset)}
                        disabled={captionLoading["latest"]}
                      >
                        {captionLoading["latest"] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Generate caption</TooltipContent>
                  </Tooltip>
                  <a
                    href={generatedUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="icon" variant="secondary">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
              {captions["latest"] && (
                <CaptionDisplay
                  caption={captions["latest"]}
                  onClose={() => setCaptions((prev) => { const n = { ...prev }; delete n["latest"]; return n; })}
                />
              )}
            </CardContent>
          </Card>
        )}

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
                No images generated yet. Create your first one above!
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
                          <Badge variant="secondary" className="text-[10px]">
                            {img.preset}
                          </Badge>
                          <span className="text-[10px] text-white/70">
                            {format(new Date(img.created_at), "dd MMM")}
                          </span>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              onClick={() => generateCaption(img.id, img.prompt, img.preset)}
                              disabled={captionLoading[img.id]}
                            >
                              {captionLoading[img.id] ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <MessageSquare className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Generate caption</TooltipContent>
                        </Tooltip>
                        <a
                          href={getPublicUrl(img.image_path)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="icon" variant="secondary" className="h-7 w-7">
                            <Download className="w-3 h-3" />
                          </Button>
                        </a>
                      </div>
                    </div>
                    {captions[img.id] && (
                      <div className="p-3">
                        <CaptionDisplay
                          caption={captions[img.id]}
                          onClose={() => setCaptions((prev) => { const n = { ...prev }; delete n[img.id]; return n; })}
                        />
                      </div>
                    )}
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

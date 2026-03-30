import { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, UserCircle, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CANVAS_SIZE = 1080;
const FRAME_STORAGE_URL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/brand-assets/profile-frame-v1.png`;

export function BrandedProfilePicture() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingFrame, setGeneratingFrame] = useState(false);

  // Use profile avatar as default — convert to base64 to avoid CORS issues on canvas
  useEffect(() => {
    const avatarUrl = (profile as any)?.avatar_url;
    if (avatarUrl && !avatarSrc) {
      fetchImageAsBase64(avatarUrl).then(setAvatarSrc).catch(() => {
        // Fallback: try using URL directly
        setAvatarSrc(avatarUrl);
      });
    }
  }, [profile]);

  // Load or generate frame on mount
  useEffect(() => {
    loadFrame(false);
  }, []);

  const loadFrame = async (regenerate: boolean) => {
    setGeneratingFrame(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-profile-frame", {
        body: { regenerate },
      });

      if (error) throw error;
      if (data?.url) {
        // Add cache-buster for regenerated frames
        const url = regenerate ? `${data.url}?t=${Date.now()}` : data.url;
        setFrameUrl(url);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      console.error("Frame load error:", e);
      // If frame doesn't exist yet, that's okay — we'll show a message
      if (!regenerate) {
        // Try checking if the frame exists directly
        setFrameUrl(`${FRAME_STORAGE_URL_BASE}?t=${Date.now()}`);
      } else {
        toast({
          title: "Eroare",
          description: e.message || "Nu s-a putut genera cadrul.",
          variant: "destructive",
        });
      }
    } finally {
      setGeneratingFrame(false);
    }
  };

  const drawCanvas = useCallback(
    async (photoSrc: string, frameSrc: string) => {
      setGenerating(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;

      const center = CANVAS_SIZE / 2;
      const photoRadius = 400; // slightly smaller than frame cutout

      try {
        const [avatarImg, frameImg] = await Promise.all([
          loadImage(photoSrc),
          loadImage(frameSrc),
        ]);

        // Clear
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 1. Draw circular photo first (underneath)
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, photoRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Cover-fit the avatar
        const imgAspect = avatarImg.width / avatarImg.height;
        let drawW: number, drawH: number, drawX: number, drawY: number;
        if (imgAspect > 1) {
          drawH = photoRadius * 2;
          drawW = drawH * imgAspect;
          drawX = center - drawW / 2;
          drawY = center - photoRadius;
        } else {
          drawW = photoRadius * 2;
          drawH = drawW / imgAspect;
          drawX = center - photoRadius;
          drawY = center - drawH / 2;
        }
        ctx.drawImage(avatarImg, drawX, drawY, drawW, drawH);
        ctx.restore();

        // 2. Draw AI-generated frame overlay on top
        ctx.drawImage(frameImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        setIsReady(true);
      } catch (e) {
        console.error("Canvas draw error:", e);
        toast({
          title: "Eroare",
          description: "Nu s-a putut genera imaginea. Verifică cadrul.",
          variant: "destructive",
        });
      } finally {
        setGenerating(false);
      }
    },
    [toast]
  );

  // Re-draw whenever photo or frame changes
  useEffect(() => {
    if (avatarSrc && frameUrl) {
      drawCanvas(avatarSrc, frameUrl);
    }
  }, [avatarSrc, frameUrl, drawCanvas]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "eduforyou-profile-picture.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast({ title: "Descărcat!", description: "Imaginea de profil a fost salvată." });
  };

  const handleRegenerateFrame = () => {
    setIsReady(false);
    loadFrame(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCircle className="w-5 h-5" />
          Branded Profile Picture
        </CardTitle>
        <CardDescription>
          Generează o poză de profil premium cu cadru AI EduForYou pentru social media
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {/* Canvas preview */}
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
            {(generating || generatingFrame) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {generatingFrame ? "Se generează cadrul AI..." : "Se compune imaginea..."}
                  </span>
                </div>
              </div>
            )}
            {!avatarSrc && !generating && !generatingFrame && (
              <div className="text-center text-muted-foreground text-sm p-4">
                <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-40" />
                Încarcă o poză pentru a genera
              </div>
            )}
            <canvas
              ref={canvasRef}
              className={`w-full h-full ${!avatarSrc ? "hidden" : ""}`}
              style={{ borderRadius: "50%" }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1" />
              {avatarSrc ? "Schimbă poza" : "Încarcă poză"}
            </Button>
            {isReady && (
              <Button size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Descarcă
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerateFrame}
              disabled={generatingFrame}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${generatingFrame ? "animate-spin" : ""}`} />
              Regenerează cadrul
            </Button>
          </div>

          {avatarSrc && (
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Descarcă și folosește ca poză de profil pe Facebook, Instagram, LinkedIn, WhatsApp etc.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

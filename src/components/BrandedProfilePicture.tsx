import { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, UserCircle, Loader2, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import frameAgent from "@/assets/profile-frame-transparent.png";
import frameAdmin from "@/assets/profile-frame-admin.png";

const CANVAS_SIZE = 1080;

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function BrandedProfilePicture() {
  const { profile, role, user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const avatarUrl = (profile as any)?.avatar_url;
    if (avatarUrl && !avatarSrc) {
      fetchImageAsBase64(avatarUrl)
        .then(setAvatarSrc)
        .catch(() => setAvatarSrc(avatarUrl));
    }
  }, [profile, avatarSrc]);

  const drawCanvas = useCallback(
    async (photoSrc: string) => {
      setGenerating(true);
      setIsReady(false);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;

      const center = CANVAS_SIZE / 2;
      const photoRadius = CANVAS_SIZE / 2;

      try {
        const safePhotoSrc = photoSrc.startsWith("data:") ? photoSrc : await fetchImageAsBase64(photoSrc);
        const [avatarImg, frameImg] = await Promise.all([
          loadImage(safePhotoSrc),
          loadImage(role === "admin" || role === "owner" ? frameAdmin : frameAgent),
        ]);

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, photoRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const imgAspect = avatarImg.width / avatarImg.height;
        let drawW: number;
        let drawH: number;
        let drawX: number;
        let drawY: number;

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

        ctx.drawImage(frameImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        setIsReady(true);
      } catch (e) {
        console.error("Canvas draw error:", e);
        toast({
          title: "Eroare",
          description: "Nu s-a putut compune poza cu overlay-ul transparent.",
          variant: "destructive",
        });
      } finally {
        setGenerating(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (avatarSrc) {
      drawCanvas(avatarSrc);
    }
  }, [avatarSrc, drawCanvas]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Fișier invalid", description: "Încarcă JPG sau PNG", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Prea mare", description: "Maximum 5MB", variant: "destructive" });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setAvatarSrc(reader.result as string);
    reader.readAsDataURL(file);

    // Also save as profile avatar
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url } as any)
        .eq("id", user.id);
      if (updateErr) throw updateErr;

      toast({ title: "Poză salvată", description: "Poza de profil a fost actualizată." });
    } catch (err: any) {
      toast({ title: "Eroare upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCircle className="w-5 h-5" />
          Branded Profile Picture
        </CardTitle>
        <CardDescription>
          Generează o poză de profil premium cu overlay transparent EduForYou
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Se compune imaginea...</span>
                </div>
              </div>
            )}

            {!avatarSrc && !generating && (
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

          <div className="flex flex-wrap gap-2 justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" />
              {avatarSrc ? "Schimbă poza" : "Încarcă poză"}
            </Button>
            {isReady && (
              <Button size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Descarcă
              </Button>
            )}
          </div>

          {avatarSrc && (
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Poza umple cercul complet, iar overlay-ul transparent rămâne fix pe margine.
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
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

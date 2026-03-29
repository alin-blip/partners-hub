import { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Upload, UserCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LOGO_URL = "/images/eduforyou-icon.jpg";
const CANVAS_SIZE = 1080;
const BORDER_WIDTH = 140;
const LOGO_ICON_SIZE = 70;

export function BrandedProfilePicture() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Use profile avatar as default
  useEffect(() => {
    if ((profile as any)?.avatar_url) {
      setAvatarSrc((profile as any).avatar_url);
    }
  }, [profile]);

  const drawCanvas = useCallback(async (src: string) => {
    setGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const center = CANVAS_SIZE / 2;
    const photoRadius = center - BORDER_WIDTH;

    try {
      // Load avatar image
      const avatarImg = await loadImage(src);
      // Load logo
      const logoImg = await loadImage(LOGO_URL);

      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw branded ring background (orange gradient)
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      gradient.addColorStop(0, "#E8600A");
      gradient.addColorStop(1, "#F28C38");
      ctx.beginPath();
      ctx.arc(center, center, center, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw white ring separator
      ctx.beginPath();
      ctx.arc(center, center, photoRadius + 4, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      // Draw circular photo
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

      // Draw icon + "EduForYou" text at the top of the ring
      const iconSize = LOGO_ICON_SIZE;
      const iconAspect = logoImg.width / logoImg.height;
      const iconW = iconSize * iconAspect;
      const iconX = center - 120;
      const iconY = 30;

      // White pill background
      const pillW = 280;
      const pillH = iconSize + 20;
      const pillX = center - pillW / 2;
      const pillY = iconY - 6;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();

      ctx.drawImage(logoImg, iconX, iconY + 4, iconW, iconSize - 8);

      // "EduForYou" text next to icon
      ctx.fillStyle = "#E8600A";
      ctx.font = "bold 38px Inter, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("EduForYou", iconX + iconW + 10, iconY + iconSize / 2);

      // "AGENT CERTIFICAT" banner at the bottom
      const bannerH = 70;
      const bannerY = CANVAS_SIZE - BORDER_WIDTH + 15;
      const bannerGrad = ctx.createLinearGradient(0, bannerY, CANVAS_SIZE, bannerY);
      bannerGrad.addColorStop(0, "rgba(15, 25, 45, 0.95)");
      bannerGrad.addColorStop(1, "rgba(25, 40, 70, 0.95)");

      // Pill-shaped banner
      const bannerW = 460;
      const bannerX = center - bannerW / 2;
      ctx.fillStyle = bannerGrad;
      roundRect(ctx, bannerX, bannerY, bannerW, bannerH, bannerH / 2);
      ctx.fill();

      // White border on banner
      ctx.strokeStyle = "#E8600A";
      ctx.lineWidth = 3;
      roundRect(ctx, bannerX, bannerY, bannerW, bannerH, bannerH / 2);
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 34px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⭐ AGENT CERTIFICAT ⭐", center, bannerY + bannerH / 2);

      setIsReady(true);
    } catch (e) {
      console.error("Canvas draw error:", e);
      toast({ title: "Eroare", description: "Nu s-a putut genera imaginea.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [toast]);

  useEffect(() => {
    if (avatarSrc) {
      drawCanvas(avatarSrc);
    }
  }, [avatarSrc, drawCanvas]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCircle className="w-5 h-5" />
          Branded Profile Picture
        </CardTitle>
        <CardDescription>
          Generează o poză de profil cu logo-ul EduForYou pentru social media
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {/* Canvas preview */}
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

          {/* Actions */}
          <div className="flex gap-2">
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FRAME_PATH = "profile-frame-v1.png";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const forceRegenerate = body.regenerate === true;

    // Check cache first
    if (!forceRegenerate) {
      const { data: existingFile } = await adminClient.storage
        .from("brand-assets")
        .list("", { search: FRAME_PATH });

      if (existingFile && existingFile.length > 0) {
        const { data: publicUrl } = adminClient.storage
          .from("brand-assets")
          .getPublicUrl(FRAME_PATH);
        return new Response(
          JSON.stringify({ url: publicUrl.publicUrl, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch the brand icon to send as reference
    const iconUrl = `${SUPABASE_URL}/storage/v1/object/public/brand-assets/eduforyou-icon.jpg`;
    let iconBase64Url: string | null = null;

    try {
      const iconRes = await fetch(iconUrl);
      if (iconRes.ok) {
        const iconBytes = new Uint8Array(await iconRes.arrayBuffer());
        const iconB64 = btoa(String.fromCharCode(...iconBytes));
        const contentType = iconRes.headers.get("content-type") || "image/jpeg";
        iconBase64Url = `data:${contentType};base64,${iconB64}`;
      }
    } catch (e) {
      console.error("Failed to fetch icon:", e);
    }

    const prompt = `Create a 1080x1080 pixel circular profile picture frame overlay image.

CRITICAL REQUIREMENTS:
- The CENTER of the image must be COMPLETELY TRANSPARENT (alpha = 0) — this is a circular cutout where a photo will be placed underneath
- The transparent circular cutout should be approximately 800px diameter, centered
- Around this transparent center, create a PREMIUM decorative ring/border

RING DESIGN:
- Luxurious gradient ring going from deep orange (#E8600A) to warm amber (#F2A03D) to subtle gold (#FFD700)
- The ring should have depth: inner glow, subtle shine highlights, and soft outer shadow
- Glass-morphism effect with subtle light reflections on the ring surface
- Ring width approximately 120-140px

TOP BADGE — LOGO AREA:
- At the top center of the ring, place a premium pill-shaped badge
- Inside the badge: reproduce the EXACT icon from the attached reference image (orange pen with graduation cap) on the left side
- Next to the icon, write "EduForYou" in a clean, bold, modern font
- The pill badge should have a white/cream background with subtle shadow and rounded corners
- The badge should overlap slightly onto the ring from outside

BOTTOM BADGE — CERTIFICATION:
- At the bottom center of the ring, place a premium banner/badge
- Text: "CERTIFIED AGENT" in elegant uppercase letters
- Use a dark navy/charcoal background (#1A1A2E) with subtle metallic gold accents
- Add a subtle gold star or shield icon on each side of the text
- The banner should have premium styling: subtle gradient, thin gold border, rounded pill shape
- Should overlap slightly onto the ring from outside

STYLE:
- Ultra premium, luxury aesthetic — think LinkedIn Premium verified badge or exclusive membership
- Subtle decorative particles or light bokeh effects around the ring (very subtle, not distracting)
- Clean, professional, not cluttered
- The overall feel should be "exclusive certification" and "trusted professional"
- PNG format with transparency

DO NOT include any photo or face inside — the center MUST be transparent for compositing.`;

    const messageContent: any[] = [
      { type: "text", text: prompt },
    ];

    if (iconBase64Url) {
      messageContent.push({
        type: "image_url",
        image_url: { url: iconBase64Url },
      });
    }

    console.log("Generating profile frame overlay...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("No image generated");
    }

    // Extract and upload
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const { error: uploadErr } = await adminClient.storage
      .from("brand-assets")
      .upload(FRAME_PATH, binaryData, { contentType: "image/png", upsert: true });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      throw new Error("Failed to save frame");
    }

    const { data: publicUrl } = adminClient.storage
      .from("brand-assets")
      .getPublicUrl(FRAME_PATH);

    console.log("Frame generated and cached:", publicUrl.publicUrl);

    return new Response(
      JSON.stringify({ url: publicUrl.publicUrl, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-profile-frame error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

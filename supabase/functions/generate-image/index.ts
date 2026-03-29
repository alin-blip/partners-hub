import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { prompt, preset, includePhoto, timezone } = await req.json();
    if (!prompt || !preset) throw new Error("Missing prompt or preset");

    // Daily limit check — use client timezone so reset aligns with user's midnight
    const tz = timezone || "Europe/Bucharest";
    const now = new Date();
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = now.toLocaleString("en-US", { timeZone: tz });
    const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
    const todayInTz = new Date(now.getTime() + offsetMs);
    todayInTz.setHours(0, 0, 0, 0);
    const todayUtc = new Date(todayInTz.getTime() - offsetMs);

    const { count } = await adminClient
      .from("generated_images")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayUtc.toISOString());

    const DAILY_LIMIT = 20;
    if ((count ?? 0) >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Daily limit reached (${DAILY_LIMIT}/${DAILY_LIMIT}). Try again tomorrow.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch brand settings
    const { data: brand } = await adminClient.from("brand_settings").select("*").limit(1).single();

    // Fetch user profile for avatar
    const { data: profile } = await adminClient.from("profiles").select("avatar_url, full_name").eq("id", user.id).single();

    // Preset definitions
    const presetInstructions: Record<string, string> = {
      social_post: "Create a 1080x1080 square social media post image. Modern, eye-catching design suitable for Instagram/Facebook.",
      story: "Create a 1080x1920 vertical story image. Bold, engaging design for Instagram/Facebook stories.",
      flyer: "Create an A5 portrait flyer image. Professional print-ready design with clear hierarchy.",
      banner: "Create a 1200x628 horizontal banner image. Clean, professional design for web/social headers.",
    };

    const presetText = presetInstructions[preset] || presetInstructions.social_post;

    // Build prompt
    let fullPrompt = `${presetText}\n\nContent/Theme: ${prompt}`;

    if (brand?.brand_prompt) {
      fullPrompt += `\n\nBrand Guidelines: ${brand.brand_prompt}`;
    }

    if (includePhoto && profile?.avatar_url) {
      fullPrompt += `\n\nInclude a professional headshot placeholder for ${profile.full_name || "the agent"} — show a friendly, professional person as a recruitment consultant.`;
    }

    // Fetch the brand logo and convert to base64 for multimodal input
    let logoBase64Url: string | null = null;
    const logoStorageUrl = `${SUPABASE_URL}/storage/v1/object/public/brand-assets/eduforyou-logo.png`;
    const logoSourceUrl = brand?.logo_url || logoStorageUrl;

    try {
      const logoRes = await fetch(logoSourceUrl);
      if (logoRes.ok) {
        const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
        const logoB64 = btoa(String.fromCharCode(...logoBytes));
        const contentType = logoRes.headers.get("content-type") || "image/png";
        logoBase64Url = `data:${contentType};base64,${logoB64}`;
        fullPrompt += "\n\nIncorporate this exact company logo into the design. Place it clearly and visually in a visible corner. Do NOT invent or create a different logo — use ONLY the provided logo image exactly as it is:";
      }
    } catch (e) {
      console.error("Failed to fetch logo:", e);
    }

    // Build messages — multimodal if logo available, text-only otherwise
    let messageContent: any;
    if (logoBase64Url) {
      messageContent = [
        { type: "text", text: fullPrompt },
        { type: "image_url", image_url: { url: logoBase64Url } },
      ];
    } else {
      messageContent = fullPrompt;
    }

    // Call AI
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
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact admin." }), {
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

    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload to storage
    const fileName = `${user.id}/${Date.now()}_${preset}.png`;
    const { error: uploadErr } = await adminClient.storage
      .from("generated-images")
      .upload(fileName, binaryData, { contentType: "image/png", upsert: false });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      throw new Error("Failed to save image");
    }

    const { data: publicUrl } = adminClient.storage.from("generated-images").getPublicUrl(fileName);

    // Save record
    await adminClient.from("generated_images").insert({
      user_id: user.id,
      prompt,
      preset,
      image_path: fileName,
    });

    return new Response(
      JSON.stringify({
        url: publicUrl.publicUrl,
        remaining: DAILY_LIMIT - ((count ?? 0) + 1),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

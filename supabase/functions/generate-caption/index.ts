import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { prompt, preset } = await req.json();
    if (!prompt) throw new Error("Missing prompt");

    // Fetch brand settings for voice/DNA
    const { data: brand } = await adminClient.from("brand_settings").select("brand_prompt").limit(1).single();

    const presetLabels: Record<string, string> = {
      social_post: "Instagram/Facebook post",
      story: "Instagram/Facebook story",
      flyer: "promotional flyer",
      banner: "web/social banner",
    };
    const presetLabel = presetLabels[preset] || "social media post";

    const systemPrompt = `You are the social media manager for EduForYou UK, an education recruitment agency that helps students find the right university courses in the UK.

${brand?.brand_prompt ? `Brand Voice & Guidelines:\n${brand.brand_prompt}\n` : ""}
Write an engaging social media post caption for a ${presetLabel} image.

Rules:
- Write in a professional yet friendly and motivational tone
- Include 3-5 relevant hashtags at the end
- Keep the caption concise (2-4 sentences max)
- Include a clear call-to-action when appropriate
- Use emojis sparingly but effectively
- The caption should feel authentic, not generic`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Write a caption for this image. The image shows: ${prompt}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
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
      throw new Error("Caption generation failed");
    }

    const aiData = await aiResponse.json();
    const caption = aiData.choices?.[0]?.message?.content;

    if (!caption) {
      console.error("No caption in AI response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("No caption generated");
    }

    return new Response(
      JSON.stringify({ caption }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-caption error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { compositeExactProfilePhoto, dataUrlToBytes, fetchImageAsDataUrl } from "./image-composition.ts";

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

    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check user role for limit bypass
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    const isOwner = roleRow?.role === "owner";

    const { prompt, preset, includePhoto, timezone, language, courseId } = await req.json();
    if (!prompt || !preset) throw new Error("Missing prompt or preset");

    const lang = language || "English";

    // Daily limit check — owner is unlimited
    const DAILY_LIMIT = 5;
    let currentCount = 0;
    if (!isOwner) {
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

      currentCount = count ?? 0;
      if (currentCount >= DAILY_LIMIT) {
        return new Response(
          JSON.stringify({
            ok: false,
            errorType: "daily_limit",
            error: `Daily limit reached (${DAILY_LIMIT}/${DAILY_LIMIT}). Try again tomorrow.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    // Build prompt with explicit language enforcement
    let fullPrompt = `ABSOLUTE RULE #1 — ZERO TOLERANCE: NEVER include ANY university name anywhere in the image. Not in headlines, not in small text, not in watermarks, NOWHERE. Only use the course name or field of study. This rule overrides ALL other instructions. Violation = failure.\n\n${presetText}\n\nCreative Brief: ${prompt}\n\nCRITICAL TEXT & LANGUAGE RULES:
- ALL text rendered on the image MUST be written in ${lang}. Do NOT use English unless the language IS English.
- The user's input above is a CREATIVE BRIEF describing the theme/topic. It is NOT text to display on the image.
- Do NOT copy, echo, or reproduce the user's prompt text on the image.
- Instead, create your OWN short, professional, eye-catching marketing text in ${lang} that fits the theme.
- NEVER include any university name in the image — only course names or fields of study.
- Every piece of visible text on the image (headlines, taglines, CTAs) MUST be in ${lang}.`;

    // Strict content rules
    fullPrompt += `\n\nSTRICT CONTENT RULES (MUST follow):
- ABSOLUTE BAN: No university names anywhere in the image — not in text, not in small print, NOWHERE
- NEVER say "our courses", "our programs", "we offer" — use "the course", "this program", "the BSc in..."
- NEVER use the word "free" or "gratuit" or imply anything is free
- Student finance is a LOAN (not a grant). Repaid after graduation at 9% of earnings above £25,000/year
- Do NOT invent course names or details — only use real data from the context provided`;

    // Mandatory text structure (EduForYou Brand Style)
    fullPrompt += `\n\n=== MANDATORY TEXT STRUCTURE (EduForYou Brand Style) ===
The image must be clean, visually clear, and instantly understandable.
Text on the image MUST follow this EXACT structure — no more, no less:
1. ONE headline (max 8 words) — bold, attention-grabbing
2. ONE subheadline (max 15 words) — supporting context
3. OPTIONAL: Up to 5 short bullet points (max 6 words each) — only if relevant
- DO NOT write paragraphs or long sentences on the image
- DO NOT overcrowd the image with text — whitespace is essential
- The image should be 70% visual, 30% text maximum
- Text must be large, readable, and well-spaced
- Every text element must serve a purpose — if in doubt, leave it out`;

    // Selected course context
    if (courseId) {
      const { data: courseRow } = await adminClient.from("courses").select("name, level, study_mode, duration, fees").eq("id", courseId).single();
      const { data: detailsRow } = await adminClient.from("course_details").select("entry_requirements, documents_required, interview_info, admission_test_info, personal_statement_guidelines, additional_info").eq("course_id", courseId).single();
      if (courseRow) {
        fullPrompt += `\n\nSELECTED COURSE CONTEXT (use these real details in image text — DO NOT mention the university name, only the course):\n- Course: ${courseRow.name}\n- Level: ${courseRow.level}\n- Study Mode: ${courseRow.study_mode}\n- Duration: ${courseRow.duration || "N/A"}\n- Fees: ${courseRow.fees || "N/A"}`;
        if (detailsRow) {
          if (detailsRow.entry_requirements) fullPrompt += `\n- Entry Requirements: ${detailsRow.entry_requirements}`;
          if (detailsRow.documents_required) fullPrompt += `\n- Documents Required: ${detailsRow.documents_required}`;
        }
      }
    }

    if (brand?.brand_prompt) {
      fullPrompt += `\n\nBrand Guidelines: ${brand.brand_prompt}`;
    }

    // Collect multimodal image inputs
    const imageInputs: Array<{ type: string; image_url: { url: string } }> = [];
    let avatarDataUrl: string | null = null;

    // Fetch the brand logo (gold graduation cap + pen + "EduForYou" text)
    const iconUrl = `${SUPABASE_URL}/storage/v1/object/public/brand-assets/eduforyou-logo.png`;
    try {
      const logoDataUrl = await fetchImageAsDataUrl(iconUrl);
      if (logoDataUrl) imageInputs.push({ type: "image_url", image_url: { url: logoDataUrl } });
    } catch (e) {
      console.error("Failed to fetch icon:", e);
    }

    // Add strict logo placement instructions
    fullPrompt += `\n\n=== MANDATORY LOGO PLACEMENT ===
The FIRST attached image is the COMPLETE official EduForYou logo (gold graduation cap + orange pen icon with the text "EduForYou").
- Place this EXACT logo image AS-IS in the bottom-right or top-right corner of the design.
- DO NOT recreate, redraw, redesign, or modify the logo in any way — copy it pixel-perfect from the attached image.
- DO NOT invent a different logo — the attached image IS the logo, use it exactly.
- The logo area should have a subtle background (white pill or semi-transparent) for readability.
- This is NON-NEGOTIABLE — every generated image MUST have this exact branding.`;

    // Handle includePhoto — use the exact profile photo as a post-generation overlay
    if (includePhoto) {
      if (!profile?.avatar_url) {
        throw new Error("Profile photo missing. Please upload one in Profile and try again.");
      }

      avatarDataUrl = await fetchImageAsDataUrl(profile.avatar_url);
      if (!avatarDataUrl) {
        throw new Error("Failed to load your profile photo. Please re-save it in Profile and try again.");
      }

      fullPrompt += `\n\n=== PROFILE PHOTO HANDOFF (CRITICAL) ===
The final design will include the EXACT profile photo of the consultant "${profile.full_name || "the agent"}" as a real overlay added AFTER image generation.
- IMAGE 1 = EduForYou logo. There is NO second reference image for the AI to redraw.
- DO NOT generate any people, faces, portraits, heads, models, or human silhouettes anywhere in the design.
- Leave a clean, unobstructed circular area in the bottom-left corner for the real profile photo overlay.
- Keep headlines, bullets, CTAs, and key design elements away from that reserved bottom-left photo area.
- The ONLY human photo allowed in the final result is the exact profile photo that will be composited afterward.`;
    }

    // Final reminder at the end of prompt (recency effect)
    fullPrompt += `\n\n=== FINAL REMINDER ===
ABSOLUTE RULE #1 REPEATED: NEVER include ANY university name in the image. Only course names or fields of study. This is the most important rule.`;

    // Build messages — multimodal if we have image inputs
    let messageContent: any;
    if (imageInputs.length > 0) {
      messageContent = [
        { type: "text", text: fullPrompt },
        ...imageInputs,
      ];
    } else {
      messageContent = fullPrompt;
    }

    // Call AI with retry logic for rate limits
    const aiRequestBody = JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: messageContent }],
      modalities: ["image", "text"],
    });

    let aiResponse: Response | null = null;
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: aiRequestBody,
      });
      if (aiResponse.status !== 429) break;
      console.log(`AI rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`);
      if (attempt < MAX_RETRIES - 1) await new Promise(r => setTimeout(r, 3000 * Math.pow(2, attempt)));
    }

    if (!aiResponse!.ok) {
      const status = aiResponse!.status;
      if (status === 429) {
        return new Response(JSON.stringify({
          ok: false,
          errorType: "rate_limit",
          error: "AI rate limit exceeded. Please try again in a moment.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({
          ok: false,
          errorType: "credits_exhausted",
          error: "AI credits exhausted. Please contact admin.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse!.text();
      console.error("AI error:", status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse!.json();
    const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("No image generated");
    }

    // Extract base64 data and composite the exact profile photo when requested
    const binaryData = includePhoto && avatarDataUrl
      ? compositeExactProfilePhoto({
          avatarDataUrl,
          imageDataUrl: imageBase64,
          preset,
        })
      : dataUrlToBytes(imageBase64);

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
        remaining: isOwner ? 999 : DAILY_LIMIT - (currentCount + 1),
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

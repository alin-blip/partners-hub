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

    const { prompt, preset, language } = await req.json();
    if (!prompt) throw new Error("Missing prompt");
    const lang = language || "English";

    // Fetch brand settings
    const { data: brand } = await adminClient.from("brand_settings").select("brand_prompt").limit(1).single();

    // Fetch knowledge base entries
    const { data: kbEntries } = await adminClient.from("ai_knowledge_base").select("title, content, category").order("category");

    // Fetch courses with universities
    const { data: courses } = await adminClient.from("courses").select("name, level, study_mode, university_id");
    const { data: universities } = await adminClient.from("universities").select("id, name").eq("is_active", true);

    // Build knowledge context
    let knowledgeContext = "";
    if (kbEntries && kbEntries.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const entry of kbEntries) {
        const cat = entry.category || "general";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(`${entry.title}: ${entry.content}`);
      }
      knowledgeContext = "\n\nKNOWLEDGE BASE (use this real data in your content):\n";
      for (const [cat, items] of Object.entries(grouped)) {
        knowledgeContext += `\n[${cat.toUpperCase()}]\n${items.join("\n")}\n`;
      }
    }

    // Build courses context — only course names, NO university names
    let coursesContext = "";
    if (courses && courses.length > 0) {
      const courseLines = courses
        .map((c: any) => `- ${c.name} (${c.level}, ${c.study_mode})`)
        .slice(0, 50);
      coursesContext = `\n\nAVAILABLE COURSES:\n${courseLines.join("\n")}\n`;
    }

    const isScript = preset === "script";

    const presetLabels: Record<string, string> = {
      social_post: "Instagram/Facebook post",
      story: "Instagram/Facebook story",
      flyer: "promotional flyer",
      banner: "web/social banner",
      script: "video teleprompter script",
    };
    const presetLabel = presetLabels[preset] || "social media post";

    const brandSection = brand?.brand_prompt ? `Brand Voice & Guidelines:\n${brand.brand_prompt}\n` : "";

    let systemPrompt: string;

    if (isScript) {
      systemPrompt = `You are the social media manager and video content creator for EduForYou UK, an education recruitment agency that helps students find the right university courses in the UK.

${brandSection}${knowledgeContext}${coursesContext}
Write a teleprompter-ready video script for a short-form video (30-60 seconds) about the given topic.
IMPORTANT: Write the ENTIRE script in ${lang}.

Rules:
- Write in a conversational, natural speaking tone — as if talking directly to the viewer
- Use short sentences that are easy to read from a teleprompter
- Start with a hook / attention grabber (first 3 seconds)
- Reference REAL courses and admissions info from the knowledge base above when relevant
- NEVER mention specific university names — only refer to course names or fields of study generally
- Include a clear CTA (call-to-action) at the end — e.g. "Send us a message", "Link in bio", "Comment below", "Book your free consultation"
- Keep it concise: 80-150 words max
- Add [PAUSE] markers where the speaker should take a brief pause
- Do NOT include hashtags or emojis — this is spoken text
- The script MUST be written in ${lang}
- End with a strong, actionable CTA`;
    } else {
      systemPrompt = `You are the social media manager for EduForYou UK, an education recruitment agency that helps students find the right university courses in the UK.

${brandSection}${knowledgeContext}${coursesContext}
Write an engaging social media post caption for a ${presetLabel} image.
IMPORTANT: Write the ENTIRE caption in ${lang}.

Rules:
- Write in a professional yet friendly and motivational tone
- Include 3-5 relevant hashtags at the end
- Keep the caption concise (2-4 sentences max)
- Reference REAL courses, universities, intakes, or admissions data from the knowledge base above when relevant to the topic
- ALWAYS include a clear call-to-action (CTA) — e.g. "DM us now", "Link in bio", "Apply today", "Book your free consultation", "Comment 'INFO' below"
- The CTA should feel natural and actionable, not generic
- Use emojis sparingly but effectively
- The caption should feel authentic, not generic
- The caption MUST be written in ${lang}`;
    }

    const userMessage = isScript
      ? `Write a teleprompter script about: ${prompt}`
      : `Write a caption for this image. The image shows: ${prompt}`;

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
          { role: "user", content: userMessage },
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

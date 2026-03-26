import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const schemaByType: Record<string, string> = {
  courses: `Return a JSON array of objects with: name (string), level (one of: undergraduate, postgraduate, foundation), study_mode (one of: blended, online, on-campus, part-time, full-time). Example: [{"name":"BSc Computer Science","level":"undergraduate","study_mode":"blended"}]`,
  timetable: `Return a JSON array of objects with: label (string – the group/pattern name with day and times). Example: [{"label":"Group A – Monday 9am-1pm"},{"label":"Group B – Tuesday 2pm-6pm"}]`,
  campuses: `Return a JSON array of objects with: name (string), city (string or null). Example: [{"name":"Main Campus","city":"London"}]`,
  intakes: `Return a JSON array of objects with: label (string), start_date (YYYY-MM-DD), application_deadline (YYYY-MM-DD or null). Example: [{"label":"September 2026","start_date":"2026-09-15","application_deadline":"2026-08-01"}]`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { file_base64, file_type, document_type } = await req.json();

    if (!file_base64 || !document_type) {
      return new Response(JSON.stringify({ success: false, error: "Missing file or document_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const schema = schemaByType[document_type];
    if (!schema) {
      return new Response(JSON.stringify({ success: false, error: "Invalid document_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a document data extractor for a UK education platform. Extract structured data from the uploaded document.
Document type: ${document_type}
${schema}
IMPORTANT: Return ONLY the JSON array. No markdown, no explanation, no code fences. Just the raw JSON array.
If you cannot find any relevant data, return an empty array [].`;

    // Determine media type for the content
    const isImage = file_type?.startsWith("image/");
    const isPdf = file_type === "application/pdf";

    // Build the user message content
    const userContent: any[] = [];

    if (isImage) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${file_type};base64,${file_base64}` },
      });
      userContent.push({ type: "text", text: "Extract the structured data from this image." });
    } else if (isPdf) {
      // For PDFs, send as inline_data for Gemini vision
      userContent.push({
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${file_base64}` },
      });
      userContent.push({ type: "text", text: "Extract the structured data from this PDF document." });
    } else {
      // For other file types (XLSX, DOCX), decode base64 text content
      let textContent: string;
      try {
        const bytes = Uint8Array.from(atob(file_base64), (c) => c.charCodeAt(0));
        textContent = new TextDecoder().decode(bytes);
      } catch {
        textContent = atob(file_base64);
      }
      userContent.push({
        type: "text",
        text: `Extract the structured data from this document content:\n\n${textContent.substring(0, 50000)}`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: false, error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "[]";

    // Parse the JSON array from AI response
    let items: any[];
    try {
      // Remove potential markdown fences
      const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      items = JSON.parse(cleaned);
      if (!Array.isArray(items)) items = [];
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      items = [];
    }

    return new Response(JSON.stringify({ success: true, items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-settings-document error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { student_id, document_type, use_guidelines = true } = await req.json();
    if (!student_id || !document_type) {
      return new Response(JSON.stringify({ error: "student_id and document_type are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch student data
    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("*")
      .eq("id", student_id)
      .single();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch enrollments with university/course info
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("status, notes, course_id, universities(name), courses(name, level, study_mode)")
      .eq("student_id", student_id);

    const enrollmentInfo = (enrollments || []).map((e: any) =>
      `${e.courses?.name || "Unknown course"} (${e.courses?.level || ""}) at ${e.universities?.name || "Unknown"} — Status: ${e.status}`
    ).join("\n");

    // Fetch course details for personal statement guidelines
    let courseDetailsInfo = "";
    if (document_type === "personal_statement" && use_guidelines && enrollments && enrollments.length > 0) {
      const courseIds = enrollments.map((e: any) => e.course_id).filter(Boolean);
      if (courseIds.length > 0) {
        const { data: courseDetails } = await adminClient
          .from("course_details")
          .select("personal_statement_guidelines, entry_requirements, courses(name)")
          .in("course_id", courseIds);
        if (courseDetails && courseDetails.length > 0) {
          courseDetailsInfo = courseDetails.map((cd: any) => {
            const parts = [`Course: ${cd.courses?.name || "Unknown"}`];
            if (cd.personal_statement_guidelines) parts.push(`Guidelines: ${cd.personal_statement_guidelines}`);
            if (cd.entry_requirements) parts.push(`Entry Requirements: ${cd.entry_requirements}`);
            return parts.join("\n");
          }).join("\n\n");
        }
      }
    }

    // Build student profile summary
    const profileSummary = [
      `Name: ${student.title ? student.title + " " : ""}${student.first_name} ${student.last_name}`,
      student.email ? `Email: ${student.email}` : null,
      student.phone ? `Phone: ${student.phone}` : null,
      student.date_of_birth ? `Date of Birth: ${student.date_of_birth}` : null,
      student.nationality ? `Nationality: ${student.nationality}` : null,
      student.gender ? `Gender: ${student.gender}` : null,
      student.full_address ? `Address: ${student.full_address}` : null,
      student.immigration_status ? `Immigration Status: ${student.immigration_status}` : null,
      student.qualifications ? `Qualifications: ${student.qualifications}` : null,
      student.study_pattern ? `Study Pattern: ${student.study_pattern}` : null,
      student.ni_number ? `NI Number: ${student.ni_number}` : null,
      student.share_code ? `Share Code: ${student.share_code}` : null,
      enrollmentInfo ? `\nEnrollments:\n${enrollmentInfo}` : null,
    ].filter(Boolean).join("\n");

    let systemPrompt: string;

    if (document_type === "cv") {
      systemPrompt = `You are an expert CV writer for UK university students. Generate a professional, well-structured CV in Markdown format based on the student profile provided.

Guidelines:
- Use a clean, professional format with clear sections
- Include: Personal Details, Personal Profile/Objective, Education, Qualifications, Skills, and any relevant information
- If qualifications text contains multiple items, split them into bullet points
- Make it suitable for UK employment/university applications
- Be professional but personable
- Use the enrollment/course information to fill the Education section
- If information is missing, skip that section rather than adding placeholders
- Output ONLY the CV content in Markdown, no explanations`;
    } else {
      systemPrompt = `You are ghostwriting a personal statement for a real student applying to a UK university. Your goal is to sound like a genuine human student wrote it — not an AI.

Critical rules for sounding human and undetectable:
- Write in first person, as the student themselves
- Use natural, conversational British English — not overly polished or formal
- Vary sentence length: mix short punchy sentences with longer ones. Avoid uniform rhythm
- Include occasional informal phrasing, colloquialisms, or mild hedging ("I think", "to be honest", "looking back")
- Avoid AI giveaways: no "in conclusion", "furthermore", "I am deeply passionate", "in today's ever-changing world", "I have always been fascinated by", "this ignited my passion", "I am eager to", "moreover", "encompasses", "multifaceted", "delve into", "hone my skills"
- Don't start every paragraph the same way. Vary openers — start some with an anecdote, a question, a memory, or a direct statement
- Show personality: include a specific personal anecdote or memory that feels real and particular (not generic)
- Be specific about experiences, not vague ("my Saturday job at Tesco taught me…" not "my work experience taught me…")
- Use contractions naturally (I'm, didn't, wasn't, it's)
- Let some sentences be imperfect or slightly awkward — real students don't write perfectly
- Avoid listing traits in threes or using obvious rhetorical structures
- Don't over-explain or over-justify every point — trust the reader
- 500-700 words ideal length (unless specific guidelines say otherwise)
- Include genuine motivation for the chosen course
- Reference qualifications and experience naturally, woven into the narrative
- Mention career aspirations but keep it grounded, not grandiose
- Suitable for UCAS or direct university applications in the UK
- Use the enrollment/course information to tailor the statement
- Output ONLY the personal statement text in Markdown, no explanations`;

      if (courseDetailsInfo) {
        systemPrompt += `\n\nIMPORTANT — Follow these SPECIFIC university/course guidelines:\n${courseDetailsInfo}\n\nYou MUST adhere to any word count limits, specific topics to cover, and formatting requirements specified above.`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a ${document_type === "cv" ? "CV" : "personal statement"} for the following student:\n\n${profileSummary}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact the owner." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content, document_type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-student-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is owner or admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["owner", "admin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { university_id, university_url } = await req.json();
    if (!university_id || !university_url) {
      return new Response(
        JSON.stringify({ error: "university_id and university_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scanning course details for university ${university_id} at ${university_url}`);

    // Step 1: Find courses without details
    const { data: allCourses } = await adminClient
      .from("courses")
      .select("id, name")
      .eq("university_id", university_id)
      .eq("is_active", true);

    if (!allCourses || allCourses.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active courses found", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingDetails } = await adminClient
      .from("course_details")
      .select("course_id")
      .in("course_id", allCourses.map((c) => c.id));

    const existingIds = new Set((existingDetails || []).map((d) => d.course_id));
    const missingCourses = allCourses.filter((c) => !existingIds.has(c.id));

    if (missingCourses.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All courses already have details", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${missingCourses.length} courses without details: ${missingCourses.map(c => c.name).join(", ")}`);

    // Step 2: Map site to find course URLs
    const courseNames = missingCourses.map((c) => c.name);
    const searchQuery = "courses programmes " + courseNames.slice(0, 5).join(" ");

    console.log("Mapping site with search:", searchQuery);

    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: university_url,
        search: searchQuery,
        limit: 200,
        includeSubdomains: true,
      }),
    });

    const mapData = await mapRes.json();
    if (!mapRes.ok) {
      console.error("Map error:", mapData);
      return new Response(
        JSON.stringify({ error: "Failed to map university site", details: mapData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allUrls: string[] = mapData.links || [];
    console.log(`Found ${allUrls.length} URLs on site`);

    // Filter URLs likely to be course pages
    const courseKeywords = ["course", "programme", "program", "study", "degree", "undergraduate", "postgraduate", "mba", "msc", "bsc", "ba-"];
    const courseUrls = allUrls.filter((url: string) => {
      const lower = url.toLowerCase();
      return courseKeywords.some((kw) => lower.includes(kw));
    });

    // Also try to match specific course names to URLs
    const urlsToScrape = new Set<string>();

    for (const course of missingCourses) {
      const nameSlug = course.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const nameWords = course.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

      for (const url of courseUrls) {
        const lower = url.toLowerCase();
        // Check if URL contains significant words from the course name
        const matchCount = nameWords.filter((w: string) => lower.includes(w)).length;
        if (matchCount >= 2 || lower.includes(nameSlug)) {
          urlsToScrape.add(url);
        }
      }
    }

    // If we didn't find specific matches, take top course URLs
    if (urlsToScrape.size === 0 && courseUrls.length > 0) {
      courseUrls.slice(0, 30).forEach((u: string) => urlsToScrape.add(u));
    }

    // Also add general course listing pages
    const listingUrls = allUrls.filter((url: string) => {
      const lower = url.toLowerCase();
      return (lower.includes("/courses") || lower.includes("/programmes")) && !lower.includes("#");
    });
    listingUrls.slice(0, 5).forEach((u: string) => urlsToScrape.add(u));

    const finalUrls = Array.from(urlsToScrape).slice(0, 30);
    console.log(`Scraping ${finalUrls.length} URLs`);

    if (finalUrls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No matching course pages found on site", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Scrape pages in batches of 5
    const scrapedContent: { url: string; content: string }[] = [];

    for (let i = 0; i < finalUrls.length; i += 5) {
      const batch = finalUrls.slice(i, i + 5);
      const promises = batch.map(async (url) => {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });
          const data = await res.json();
          const md = data?.data?.markdown || data?.markdown || "";
          if (md && md.length > 100) {
            return { url, content: md.slice(0, 8000) };
          }
          return null;
        } catch (e) {
          console.error(`Scrape error for ${url}:`, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      for (const r of results) {
        if (r) scrapedContent.push(r);
      }

      // Small delay between batches
      if (i + 5 < finalUrls.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    console.log(`Scraped ${scrapedContent.length} pages successfully`);

    if (scrapedContent.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Could not scrape any course pages", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Use AI to extract course details
    const combinedContent = scrapedContent
      .map((s) => `--- PAGE: ${s.url} ---\n${s.content}`)
      .join("\n\n");

    const courseNamesList = missingCourses.map((c) => c.name).join("\n- ");

    const aiPrompt = `You are extracting course admission details from university website content.

Here are the EXACT course names I need details for:
- ${courseNamesList}

From the scraped website content below, extract the following details for EACH course you can find information about:
1. entry_requirements - Academic qualifications, grades, UCAS points needed
2. admission_test_info - Any admission tests required
3. interview_info - Interview requirements or process
4. documents_required - Documents needed for application (e.g., CV, references, transcripts)
5. personal_statement_guidelines - Personal statement requirements or tips
6. additional_info - Any other relevant info (DBS checks, work placement, travel requirements, etc.)

IMPORTANT RULES:
- Only include courses from the list above. Match course names EXACTLY.
- If you cannot find info for a course, do NOT include it in the output.
- If a field has no info, set it to null.
- Return ONLY a valid JSON array, no other text.

Each object must have this structure:
{
  "course_name": "exact course name from list",
  "entry_requirements": "string or null",
  "admission_test_info": "string or null",
  "interview_info": "string or null",
  "documents_required": "string or null",
  "personal_statement_guidelines": "string or null",
  "additional_info": "string or null"
}

SCRAPED CONTENT:
${combinedContent.slice(0, 100000)}`;

    console.log("Calling AI to extract course details...");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You extract structured course details from university website content. Return only valid JSON arrays.",
          },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI extraction failed", status: aiRes.status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let extractedCourses: any[];
    try {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      extractedCourses = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI extraction results", raw: rawContent.slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI extracted details for ${extractedCourses.length} courses`);

    // Step 5: Match and upsert
    const courseNameMap = new Map(missingCourses.map((c) => [c.name.toLowerCase().trim(), c.id]));
    let updated = 0;
    const updatedNames: string[] = [];

    for (const ext of extractedCourses) {
      const courseId = courseNameMap.get(ext.course_name?.toLowerCase()?.trim());
      if (!courseId) {
        console.log(`No match for extracted course: ${ext.course_name}`);
        continue;
      }

      // Check at least one field has content
      const hasContent = [
        ext.entry_requirements,
        ext.admission_test_info,
        ext.interview_info,
        ext.documents_required,
        ext.personal_statement_guidelines,
        ext.additional_info,
      ].some((v) => v && v.trim());

      if (!hasContent) continue;

      const { error } = await adminClient.from("course_details").upsert(
        {
          course_id: courseId,
          entry_requirements: ext.entry_requirements || null,
          admission_test_info: ext.admission_test_info || null,
          interview_info: ext.interview_info || null,
          documents_required: ext.documents_required || null,
          personal_statement_guidelines: ext.personal_statement_guidelines || null,
          additional_info: ext.additional_info || null,
        },
        { onConflict: "course_id" }
      );

      if (error) {
        console.error(`Upsert error for ${ext.course_name}:`, error);
      } else {
        updated++;
        updatedNames.push(ext.course_name);
      }
    }

    console.log(`Updated ${updated} courses: ${updatedNames.join(", ")}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Extracted details for ${updated} out of ${missingCourses.length} courses`,
        updated,
        total_missing: missingCourses.length,
        updated_courses: updatedNames,
        pages_scraped: scrapedContent.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

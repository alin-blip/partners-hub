import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Normalize a string for fuzzy comparison */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(hons?\)/gi, "")
    .replace(/\b(bsc|ba|msc|ma|hnd|btec|higher national diploma)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Find best matching course ID for an extracted name */
function findCourseMatch(
  extractedName: string,
  courses: { id: string; name: string; normalized: string }[]
): string | null {
  const extNorm = normalize(extractedName);

  // 1. Exact normalized match
  for (const c of courses) {
    if (c.normalized === extNorm) return c.id;
  }

  // 2. One contains the other
  for (const c of courses) {
    if (c.normalized.includes(extNorm) || extNorm.includes(c.normalized)) return c.id;
  }

  // 3. Word overlap score (>= 60% of words match)
  const extWords = extNorm.split(" ").filter((w) => w.length > 2);
  let bestScore = 0;
  let bestId: string | null = null;

  for (const c of courses) {
    const cWords = c.normalized.split(" ").filter((w) => w.length > 2);
    const matchCount = extWords.filter((w) => cWords.includes(w)).length;
    const score = matchCount / Math.max(extWords.length, cWords.length);
    if (score > bestScore && score >= 0.6) {
      bestScore = score;
      bestId = c.id;
    }
  }

  return bestId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles").select("role").eq("user_id", user.id).single();

    if (!roleData || !["owner", "admin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      .from("courses").select("id, name").eq("university_id", university_id).eq("is_active", true);

    if (!allCourses || allCourses.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active courses found", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingDetails } = await adminClient
      .from("course_details").select("course_id").in("course_id", allCourses.map((c) => c.id));

    const existingIds = new Set((existingDetails || []).map((d) => d.course_id));
    const missingCourses = allCourses.filter((c) => !existingIds.has(c.id));

    if (missingCourses.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All courses already have details", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const coursesWithNorm = missingCourses.map((c) => ({
      ...c,
      normalized: normalize(c.name),
    }));

    console.log(`Found ${missingCourses.length} courses without details`);

    // Step 2: Use Firecrawl SEARCH to find course-specific pages (much more targeted than map)
    const urlsToScrape = new Set<string>();

    // Search for each course individually (batch in groups of 3 to avoid rate limits)
    for (let i = 0; i < missingCourses.length; i += 3) {
      const batch = missingCourses.slice(i, i + 3);
      const searchPromises = batch.map(async (course) => {
        try {
          const searchQuery = `site:${new URL(university_url).hostname} ${course.name} entry requirements`;
          const res = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: 3,
            }),
          });
          const data = await res.json();
          const results = data?.data || [];
          for (const r of results) {
            if (r?.url) urlsToScrape.add(r.url);
          }
        } catch (e) {
          console.error(`Search error for ${course.name}:`, e);
        }
      });
      await Promise.all(searchPromises);
      if (i + 3 < missingCourses.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Also map the site for course pages as fallback
    try {
      const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: university_url,
          search: "courses programmes entry requirements",
          limit: 200,
          includeSubdomains: true,
        }),
      });
      const mapData = await mapRes.json();
      const allUrls: string[] = mapData.links || [];

      const courseKeywords = ["course", "programme", "program", "study", "degree"];
      for (const url of allUrls) {
        const lower = url.toLowerCase();
        if (courseKeywords.some((kw) => lower.includes(kw))) {
          urlsToScrape.add(url);
        }
      }
    } catch (e) {
      console.error("Map fallback error:", e);
    }

    const finalUrls = Array.from(urlsToScrape).slice(0, 40);
    console.log(`Found ${finalUrls.length} URLs to scrape`);

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
            body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
          });
          if (!res.ok) {
            await res.text();
            return null;
          }
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
    // Process in chunks if too many courses (to keep prompt manageable)
    const CHUNK_SIZE = 10;
    let totalUpdated = 0;
    const allUpdatedNames: string[] = [];
    const matchedIds = new Set<string>();

    for (let ci = 0; ci < missingCourses.length; ci += CHUNK_SIZE) {
      const courseChunk = missingCourses.slice(ci, ci + CHUNK_SIZE);
      const courseNamesList = courseChunk.map((c) => `"${c.name}"`).join("\n- ");

      const combinedContent = scrapedContent
        .map((s) => `--- PAGE: ${s.url} ---\n${s.content}`)
        .join("\n\n");

      const aiPrompt = `Extract course admission details from the university website content below.

I need details for these EXACT courses (use these names EXACTLY in your output):
- ${courseNamesList}

For each course, extract:
1. entry_requirements - Academic qualifications, grades, UCAS points
2. admission_test_info - Any admission tests required (null if none mentioned)
3. interview_info - Interview requirements (null if none mentioned)
4. documents_required - Documents needed for application
5. personal_statement_guidelines - Personal statement tips (null if none)
6. additional_info - DBS checks, work placement, travel requirements etc.

CRITICAL RULES:
- Use the EXACT course name from my list above in the "course_name" field
- If you find info that could apply to a course even if the page title is slightly different, include it
- If a field has no information, use null
- Return ONLY a JSON array, no markdown code blocks, no other text

Format: [{"course_name": "exact name from list", "entry_requirements": "...", "admission_test_info": "...", "interview_info": "...", "documents_required": "...", "personal_statement_guidelines": "...", "additional_info": "..."}]

WEBSITE CONTENT:
${combinedContent.slice(0, 120000)}`;

      console.log(`Calling AI for chunk ${ci / CHUNK_SIZE + 1} (${courseChunk.length} courses)...`);

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
              content: "You extract structured course admission details from university websites. Always return valid JSON arrays. Use exact course names provided by the user.",
            },
            { role: "user", content: aiPrompt },
          ],
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("AI error:", aiRes.status, errText);
        continue;
      }

      const aiData = await aiRes.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "";

      let extractedCourses: any[];
      try {
        const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON array found");
        extractedCourses = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse AI response:", rawContent.slice(0, 500));
        continue;
      }

      console.log(`AI extracted details for ${extractedCourses.length} courses`);

      // Step 5: Match and upsert with fuzzy matching
      for (const ext of extractedCourses) {
        if (!ext.course_name) continue;

        const courseId = findCourseMatch(ext.course_name, coursesWithNorm);
        if (!courseId) {
          console.log(`No match for: "${ext.course_name}"`);
          continue;
        }
        if (matchedIds.has(courseId)) continue; // Already matched

        const hasContent = [
          ext.entry_requirements, ext.admission_test_info, ext.interview_info,
          ext.documents_required, ext.personal_statement_guidelines, ext.additional_info,
        ].some((v) => v && typeof v === "string" && v.trim());

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
          totalUpdated++;
          matchedIds.add(courseId);
          const originalName = missingCourses.find((c) => c.id === courseId)?.name || ext.course_name;
          allUpdatedNames.push(originalName);
        }
      }
    }

    console.log(`Updated ${totalUpdated} courses: ${allUpdatedNames.join(", ")}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Extracted details for ${totalUpdated} out of ${missingCourses.length} courses`,
        updated: totalUpdated,
        total_missing: missingCourses.length,
        updated_courses: allUpdatedNames,
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

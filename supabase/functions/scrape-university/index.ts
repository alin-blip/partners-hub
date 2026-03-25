const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

    console.log('Step 1: Mapping site', formattedUrl);

    // Step 1: Map to find course URLs
    const mapRes = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: formattedUrl, search: 'courses programmes', limit: 200, includeSubdomains: false }),
    });
    const mapData = await mapRes.json();
    if (!mapRes.ok) {
      console.error('Map error:', JSON.stringify(mapData));
      return new Response(
        JSON.stringify({ success: false, error: mapData.error || 'Failed to map site' }),
        { status: mapRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allLinks: string[] = mapData.links || [];
    console.log(`Found ${allLinks.length} total links`);

    // Filter for course pages (individual course, not listing pages)
    const coursePatterns = ['/courses/', '/programmes/', '/program/', '/course/'];
    const courseUrls = allLinks.filter((link: string) => {
      const lower = link.toLowerCase();
      const hasPattern = coursePatterns.some(p => lower.includes(p));
      if (!hasPattern) return false;
      // Exclude listing/category/search pages
      if (lower.endsWith('/courses/') || lower.endsWith('/courses') || lower.endsWith('/programmes/') || lower.endsWith('/programmes')) return false;
      if (lower.includes('/category') || lower.includes('/search') || lower.includes('page=') || lower.includes('sitemap')) return false;
      // Must have a slug after /courses/
      const parts = lower.split('/courses/');
      if (parts.length > 1 && parts[1].replace(/\/$/, '').length > 0) return true;
      const parts2 = lower.split('/programmes/');
      if (parts2.length > 1 && parts2[1].replace(/\/$/, '').length > 0) return true;
      return false;
    });

    const uniqueUrls = [...new Set(courseUrls)];
    console.log(`Found ${uniqueUrls.length} course URLs`);

    if (uniqueUrls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, courses: [], message: 'No course pages found. Try a different URL.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Scrape the main courses listing page first (to get an overview)
    // Then scrape individual course pages in batches using markdown
    const urlsToScrape = uniqueUrls.slice(0, 25);
    const scrapedPages: { url: string; markdown: string }[] = [];
    const errors: string[] = [];

    // Scrape in batches of 5 for speed
    for (let i = 0; i < urlsToScrape.length; i += 5) {
      const batch = urlsToScrape.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (courseUrl) => {
          console.log('Scraping:', courseUrl);
          const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: courseUrl, formats: ['markdown'], onlyMainContent: true }),
          });
          const scrapeData = await scrapeRes.json();
          if (!scrapeRes.ok) {
            throw new Error(scrapeData.error || `HTTP ${scrapeRes.status}`);
          }
          const md = scrapeData.data?.markdown || scrapeData.markdown || '';
          if (!md) throw new Error('No content returned');
          return { url: courseUrl, markdown: md.slice(0, 3000) }; // Limit per page
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') scrapedPages.push(r.value);
        else errors.push(r.reason?.message || 'Unknown error');
      }
    }

    console.log(`Scraped ${scrapedPages.length} pages successfully, ${errors.length} errors`);

    if (scrapedPages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: `All scrapes failed. Errors: ${errors.slice(0, 3).join('; ')}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Use AI to extract structured course data from all scraped markdown
    const combinedContent = scrapedPages.map((p, i) =>
      `=== PAGE ${i + 1}: ${p.url} ===\n${p.markdown}`
    ).join('\n\n');

    console.log('Step 3: Extracting course data with AI...');

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You extract course information from university web pages. Return ONLY a JSON array of courses. Each course object must have:
- "name": full course name (string)
- "level": "undergraduate", "postgraduate", "foundation", or "hnd" (string)
- "study_mode": "full-time", "part-time", "blended", or "online" (string)  
- "duration": duration like "3 years" (string, empty if unknown)
- "campus_locations": array of campus city names (string[])
- "entry_requirements": brief summary (string, empty if unknown)
- "description": 1-2 sentence description (string)
- "source_url": the page URL this was extracted from (string)

Return ONLY the JSON array, no markdown formatting, no explanation.`
          },
          {
            role: 'user',
            content: `Extract all courses from these university web pages:\n\n${combinedContent}`
          }
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI API error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiRes.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    console.log('AI response length:', aiContent.length);

    // Parse the JSON from AI response
    let courses: any[] = [];
    try {
      // Remove possible markdown code fences
      const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      courses = JSON.parse(cleaned);
      if (!Array.isArray(courses)) courses = [courses];
    } catch (parseErr) {
      console.error('Failed to parse AI response:', aiContent.slice(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse extracted course data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracted ${courses.length} courses via AI`);

    return new Response(
      JSON.stringify({
        success: true,
        courses,
        totalUrlsFound: uniqueUrls.length,
        scraped: scrapedPages.length,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

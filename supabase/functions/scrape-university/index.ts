const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const courseSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Full course/programme name" },
    level: { type: "string", description: "undergraduate, postgraduate, foundation, or other" },
    study_mode: { type: "string", description: "full-time, part-time, blended, or online" },
    duration: { type: "string", description: "e.g. 3 years, 1 year" },
    campus_locations: { type: "array", items: { type: "string" }, description: "List of campus cities/locations where this course is available" },
    entry_requirements: { type: "string", description: "Entry requirements summary" },
    description: { type: "string", description: "Brief course description" },
  },
  required: ["name"],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
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

    // Step 1: Map the site to find course URLs
    const mapRes = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        search: 'courses programmes',
        limit: 200,
        includeSubdomains: false,
      }),
    });

    const mapData = await mapRes.json();
    if (!mapRes.ok) {
      console.error('Map error:', mapData);
      return new Response(
        JSON.stringify({ success: false, error: mapData.error || 'Failed to map site' }),
        { status: mapRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allLinks: string[] = mapData.links || [];
    console.log(`Found ${allLinks.length} total links`);

    // Filter for course/programme pages
    const coursePatterns = ['/courses/', '/programmes/', '/program/', '/course/'];
    const courseUrls = allLinks.filter((link: string) => {
      const lower = link.toLowerCase();
      return coursePatterns.some(p => lower.includes(p)) &&
        !lower.includes('/category') &&
        !lower.includes('/search') &&
        !lower.includes('page=') &&
        !lower.endsWith('/courses/') &&
        !lower.endsWith('/courses');
    });

    // Deduplicate
    const uniqueUrls = [...new Set(courseUrls)];
    console.log(`Found ${uniqueUrls.length} course URLs to scrape`);

    if (uniqueUrls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, courses: [], courseUrls: [], message: 'No course pages found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Scrape each course page with JSON extraction (limit to 30 to avoid timeouts)
    const urlsToScrape = uniqueUrls.slice(0, 30);
    const courses: any[] = [];
    const errors: string[] = [];

    for (const courseUrl of urlsToScrape) {
      try {
        console.log('Scraping:', courseUrl);
        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: courseUrl,
            formats: [{ type: 'json', schema: courseSchema }],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeRes.json();
        if (scrapeRes.ok) {
          const extracted = scrapeData.data?.json || scrapeData.json;
          if (extracted && extracted.name) {
            courses.push({
              ...extracted,
              source_url: courseUrl,
              campus_locations: extracted.campus_locations || [],
              level: (extracted.level || 'undergraduate').toLowerCase(),
              study_mode: (extracted.study_mode || 'blended').toLowerCase(),
            });
          }
        } else {
          errors.push(`${courseUrl}: ${scrapeData.error || 'scrape failed'}`);
        }
      } catch (e) {
        errors.push(`${courseUrl}: ${e.message}`);
      }
    }

    console.log(`Extracted ${courses.length} courses, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        courses,
        totalUrlsFound: uniqueUrls.length,
        scraped: urlsToScrape.length,
        errors: errors.length > 0 ? errors : undefined,
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

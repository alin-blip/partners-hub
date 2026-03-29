import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const postId = url.searchParams.get("post");

  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch agent profile (use profiles table directly — view may not work with service role)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!profile) {
    return new Response("Agent not found", { status: 404 });
  }

  // Fetch card settings for job_title / bio
  const { data: card } = await supabase
    .from("agent_card_settings")
    .select("job_title, bio, company_name")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .single();

  let ogImage = profile.avatar_url || "";
  let ogDescription = card?.bio || "Education consultant helping you reach your goals in the UK.";
  let ogTitle = `${profile.full_name || "Agent"}${card?.job_title ? ` – ${card.job_title}` : ""} | EduForYou UK`;

  // If a post ID is provided, use post image + caption
  if (postId) {
    const { data: post } = await supabase
      .from("social_posts")
      .select("image_url, caption")
      .eq("id", postId)
      .single();

    if (post) {
      ogImage = post.image_url || ogImage;
      ogDescription = post.caption || ogDescription;
    }
  }

  // Determine the public app URL from the request origin or fallback
  const appOrigin = Deno.env.get("APP_URL") || "https://agentseduforyou.lovable.app";
  const cardPageUrl = `${appOrigin}/card/${slug}`;

  // Escape HTML entities for safe embedding
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(ogTitle)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDescription.slice(0, 300))}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:url" content="${esc(cardPageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDescription.slice(0, 200))}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
  <meta http-equiv="refresh" content="0;url=${esc(cardPageUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${esc(cardPageUrl)}">${esc(profile.full_name || "agent card")}</a>…</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders,
    },
  });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerId = userData.user.id;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .single();

  if (!callerRole || !["owner", "admin"].includes(callerRole.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { user_id, new_password } = body;

  if (!user_id || !new_password || new_password.length < 6) {
    return new Response(JSON.stringify({ error: "Invalid user_id or password (min 6 chars)" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admin can only reset passwords for their own agents
  if (callerRole.role === "admin") {
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("admin_id")
      .eq("id", user_id)
      .single();

    if (!targetProfile || targetProfile.admin_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden: not your agent" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Don't allow changing owner's password
  const { data: targetRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user_id)
    .single();

  if (targetRole?.role === "owner") {
    return new Response(JSON.stringify({ error: "Cannot change owner password" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update password via admin API
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUser(user_id, {
    password: new_password,
  });

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Upsert into user_passwords
  const { error: upsertError } = await supabaseAdmin
    .from("user_passwords")
    .upsert(
      { user_id, password_plaintext: new_password, set_by: callerId, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("Failed to store password:", upsertError);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

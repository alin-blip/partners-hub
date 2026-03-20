import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { email, password, full_name, role = "owner", admin_id } = await req.json();

  // Validate role
  const validRoles = ["owner", "admin", "agent"];
  if (!validRoles.includes(role)) {
    return new Response(JSON.stringify({ error: "Invalid role" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assign role
  const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
    user_id: authData.user.id,
    role,
  });

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Set admin_id if provided (for agents assigned to an admin)
  if (admin_id) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ admin_id })
      .eq("id", authData.user.id);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

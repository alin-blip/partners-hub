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

  // --- JWT Authentication ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the caller using anon key client with their token
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

  // --- Role Authorization ---
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .single();

  if (!callerRole) {
    return new Response(JSON.stringify({ error: "Forbidden: no role assigned" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, password, full_name, role = "owner", admin_id, postcode, address } = await req.json();

  // Validate role value
  const validRoles = ["owner", "admin", "agent"];
  if (!validRoles.includes(role)) {
    return new Response(JSON.stringify({ error: "Invalid role" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authorization rules:
  // - Owner can create any role (owner, admin, agent)
  // - Admin can only create agents (with their own admin_id)
  // - Agents cannot create accounts
  if (callerRole.role === "agent") {
    return new Response(JSON.stringify({ error: "Forbidden: agents cannot create accounts" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (callerRole.role === "admin" && role !== "agent") {
    return new Response(JSON.stringify({ error: "Forbidden: admins can only create agent accounts" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // For admins, force admin_id to their own ID
  const effectiveAdminId = callerRole.role === "admin" ? callerId : admin_id;

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

  // Update profile with admin_id, postcode, address
  const profileUpdate: Record<string, unknown> = {};
  if (effectiveAdminId) profileUpdate.admin_id = effectiveAdminId;
  if (postcode) profileUpdate.postcode = postcode;
  if (address) profileUpdate.address = address;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", authData.user.id);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Send welcome email for new agents
  if (role === "agent") {
    // Fetch caller's name for the email
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", callerId)
      .single();

    try {
      await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "welcome-agent",
          recipientEmail: email,
          idempotencyKey: `welcome-agent-${authData.user.id}`,
          templateData: {
            agentName: full_name,
            adminName: callerProfile?.full_name || undefined,
          },
        },
      });
    } catch (e) {
      // Non-blocking — log but don't fail account creation
      console.error("Failed to send welcome email:", e);
    }
  }

  return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

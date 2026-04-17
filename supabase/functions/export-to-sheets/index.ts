import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Google auth ----
async function getAccessToken(serviceAccount: any): Promise<string> {
  const headerB64 = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claimSet = btoa(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope:
        "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const unsigned = `${headerB64}.${claimSet}`;

  if (!serviceAccount.private_key) {
    throw new Error("Service account JSON missing private_key field");
  }
  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const safe = (s: string) =>
    s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${safe(headerB64)}.${safe(claimSet)}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string> {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const sr = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const sd = await sr.json();
  if (sd.files?.length > 0) return sd.files[0].id;

  const cr = await fetch(
    `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    }
  );
  const cd = await cr.json();
  if (!cd.id)
    throw new Error(`Failed to create folder "${name}": ${JSON.stringify(cd)}`);
  return cd.id;
}

async function findSpreadsheet(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string | null> {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const d = await r.json();
  return d.files?.[0]?.id ?? null;
}

async function createSpreadsheet(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string> {
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [parentId],
      }),
    }
  );
  const d = await r.json();
  if (!d.id)
    throw new Error(`Failed to create spreadsheet "${name}": ${JSON.stringify(d)}`);
  return d.id;
}

async function getSheetsMeta(accessToken: string, spreadsheetId: string) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const d = await r.json();
  return (d.sheets || []).map((s: any) => s.properties);
}

async function batchUpdateSheets(
  accessToken: string,
  spreadsheetId: string,
  requests: any[]
) {
  if (!requests.length) return;
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    }
  );
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`batchUpdate failed: ${txt}`);
  }
  return r.json();
}

async function writeValues(
  accessToken: string,
  spreadsheetId: string,
  data: { range: string; values: any[][] }[]
) {
  if (!data.length) return;
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ valueInputOption: "RAW", data }),
    }
  );
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`values.batchUpdate failed: ${txt}`);
  }
}

// ---- Helpers ----
const sanitizeTabName = (s: string) =>
  (s || "Untitled")
    .replace(/[\[\]\*\?\/\\:]/g, " ")
    .trim()
    .slice(0, 95) || "Untitled";

const sanitizeFileName = (s: string) =>
  (s || "Untitled").replace(/[\/\\:*?"<>|]/g, "-").trim().slice(0, 100);

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ROOT_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");
    const SA_RAW = Deno.env.get("GOOGLE_DRIVE_SERVICE_ACCOUNT");

    if (!ROOT_FOLDER_ID) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID not set");
    if (!SA_RAW) throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT not set");

    const serviceAccount = JSON.parse(SA_RAW);

    // Auth caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const role = roleRow?.role;
    if (role !== "owner" && role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles (agents + admins)
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email, admin_id");
    const { data: roles } = await admin
      .from("user_roles")
      .select("user_id, role");
    const roleByUser = new Map<string, string>();
    (roles || []).forEach((r: any) => roleByUser.set(r.user_id, r.role));

    // Determine scope
    const allAgents = (profiles || []).filter(
      (p: any) => roleByUser.get(p.id) === "agent"
    );
    const allAdmins = (profiles || []).filter(
      (p: any) => roleByUser.get(p.id) === "admin"
    );

    let agentsInScope = allAgents;
    let adminsInScope = allAdmins;
    if (role === "admin") {
      agentsInScope = allAgents.filter((a: any) => a.admin_id === user.id);
      adminsInScope = allAdmins.filter((a: any) => a.id === user.id);
    }

    const agentIds = agentsInScope.map((a: any) => a.id);

    // Pull data
    const [studentsRes, enrollRes, snapsRes, paysRes] = await Promise.all([
      admin
        .from("students")
        .select(
          "id, first_name, last_name, email, phone, date_of_birth, nationality, immigration_status, address, postcode, agent_id, created_at"
        )
        .in("agent_id", agentIds.length ? agentIds : ["00000000-0000-0000-0000-000000000000"]),
      admin
        .from("enrollments")
        .select(
          `id, status, created_at, assessment_date, assessment_time, funding_status, funding_type, notes, student_id,
          students!inner(first_name, last_name, agent_id),
          universities(name),
          courses(name),
          campuses(name),
          intakes(label)`
        ),
      admin
        .from("commission_snapshots")
        .select("agent_id, admin_id, agent_rate, admin_rate, snapshot_status"),
      admin
        .from("commission_payments")
        .select("recipient_id, recipient_role, amount"),
    ]);

    const students = studentsRes.data || [];
    const enrollments = (enrollRes.data || []).filter((e: any) =>
      agentIds.includes(e.students?.agent_id)
    );
    const snapshots = snapsRes.data || [];
    const payments = paysRes.data || [];

    // Group: admin_id -> agents
    const agentsByAdmin = new Map<string, any[]>();
    for (const a of agentsInScope) {
      const key = a.admin_id || "__unassigned__";
      if (!agentsByAdmin.has(key)) agentsByAdmin.set(key, []);
      agentsByAdmin.get(key)!.push(a);
    }

    // Make sure each admin in scope has an entry (even with 0 agents)
    for (const adm of adminsInScope) {
      if (!agentsByAdmin.has(adm.id)) agentsByAdmin.set(adm.id, []);
    }

    const accessToken = await getAccessToken(serviceAccount);
    const exportsFolderId = await findOrCreateFolder(
      accessToken,
      "Exports",
      ROOT_FOLDER_ID
    );

    const results: any[] = [];

    for (const [adminKey, teamAgents] of agentsByAdmin.entries()) {
      const adminProfile = adminsInScope.find((p: any) => p.id === adminKey);
      const adminName =
        adminKey === "__unassigned__"
          ? "Unassigned Agents"
          : adminProfile?.full_name || adminProfile?.email || "Unknown Admin";

      const sheetName = sanitizeFileName(`Admin - ${adminName} — Team Export`);

      // Find or create
      let spreadsheetId = await findSpreadsheet(
        accessToken,
        sheetName,
        exportsFolderId
      );
      if (!spreadsheetId) {
        spreadsheetId = await createSpreadsheet(
          accessToken,
          sheetName,
          exportsFolderId
        );
      }

      // Plan tabs
      const desiredTabs = [
        "Summary",
        ...teamAgents.map((a: any) =>
          sanitizeTabName(a.full_name || a.email || "Agent")
        ),
      ];

      // Ensure unique tab names (in case of duplicates)
      const seen = new Set<string>();
      const uniqueDesired = desiredTabs.map((t) => {
        let name = t;
        let i = 2;
        while (seen.has(name)) name = `${t} (${i++})`.slice(0, 95);
        seen.add(name);
        return name;
      });

      // Get current tabs
      const existing = await getSheetsMeta(accessToken, spreadsheetId);

      // Step 1: add a temporary tab (sheets must always have ≥1 sheet)
      const tempTabTitle = `__tmp_${Date.now()}`;
      await batchUpdateSheets(accessToken, spreadsheetId, [
        { addSheet: { properties: { title: tempTabTitle } } },
      ]);

      // Step 2: delete all existing (non-temp) tabs
      const refreshed = await getSheetsMeta(accessToken, spreadsheetId);
      const deleteReqs = refreshed
        .filter((p: any) => p.title !== tempTabTitle)
        .map((p: any) => ({ deleteSheet: { sheetId: p.sheetId } }));
      if (deleteReqs.length) {
        await batchUpdateSheets(accessToken, spreadsheetId, deleteReqs);
      }

      // Step 3: add the desired tabs
      const addReqs = uniqueDesired.map((title) => ({
        addSheet: { properties: { title } },
      }));
      await batchUpdateSheets(accessToken, spreadsheetId, addReqs);

      // Step 4: delete temp
      const finalMeta = await getSheetsMeta(accessToken, spreadsheetId);
      const tmp = finalMeta.find((p: any) => p.title === tempTabTitle);
      if (tmp) {
        await batchUpdateSheets(accessToken, spreadsheetId, [
          { deleteSheet: { sheetId: tmp.sheetId } },
        ]);
      }

      // Build values
      const valueWrites: { range: string; values: any[][] }[] = [];

      // Summary tab
      const summaryRows: any[][] = [
        [
          "Agent",
          "Email",
          "Total Students",
          "Total Enrollments",
          "New Application",
          "Assessment Booked",
          "Conditional Offer",
          "Final Offer",
          "Enrolled",
          "Cancelled / Withdrawn",
          "Commission Earned (£)",
          "Commission Paid (£)",
          "Commission Remaining (£)",
        ],
      ];
      for (const ag of teamAgents) {
        const myStudents = students.filter((s: any) => s.agent_id === ag.id);
        const myEnrolls = enrollments.filter(
          (e: any) => e.students?.agent_id === ag.id
        );
        const countBy = (st: string) =>
          myEnrolls.filter((e: any) => e.status === st).length;
        const cancelled = myEnrolls.filter((e: any) =>
          ["cancelled", "withdrawn", "fail"].includes(e.status)
        ).length;
        const earned = snapshots
          .filter((s: any) => s.agent_id === ag.id)
          .reduce((acc: number, s: any) => acc + Number(s.agent_rate || 0), 0);
        const paid = payments
          .filter(
            (p: any) =>
              p.recipient_id === ag.id && p.recipient_role === "agent"
          )
          .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
        summaryRows.push([
          ag.full_name || "—",
          ag.email || "—",
          myStudents.length,
          myEnrolls.length,
          countBy("new_application"),
          countBy("assessment_booked"),
          countBy("conditional_offer"),
          countBy("final_offer"),
          countBy("enrolled"),
          cancelled,
          earned.toFixed(2),
          paid.toFixed(2),
          (earned - paid).toFixed(2),
        ]);
      }
      if (teamAgents.length === 0) {
        summaryRows.push(["(no agents on this team)"]);
      }
      valueWrites.push({
        range: `'Summary'!A1`,
        values: summaryRows,
      });

      // Per-agent tabs
      for (let idx = 0; idx < teamAgents.length; idx++) {
        const ag = teamAgents[idx];
        const tabTitle = uniqueDesired[idx + 1]; // +1 because Summary is at 0
        const myStudents = students.filter((s: any) => s.agent_id === ag.id);
        const myEnrolls = enrollments.filter(
          (e: any) => e.students?.agent_id === ag.id
        );

        const rows: any[][] = [];
        rows.push([`AGENT: ${ag.full_name || ag.email}`]);
        rows.push([`Email: ${ag.email || "—"}`]);
        rows.push([]);
        rows.push(["STUDENTS"]);
        rows.push([
          "First Name",
          "Last Name",
          "Email",
          "Phone",
          "Date of Birth",
          "Nationality",
          "Immigration Status",
          "Address",
          "Postcode",
          "Created",
        ]);
        if (myStudents.length === 0) {
          rows.push(["(no students)"]);
        } else {
          for (const s of myStudents) {
            rows.push([
              s.first_name || "",
              s.last_name || "",
              s.email || "",
              s.phone || "",
              s.date_of_birth || "",
              s.nationality || "",
              s.immigration_status || "",
              s.address || "",
              s.postcode || "",
              s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : "",
            ]);
          }
        }
        rows.push([]);
        rows.push(["ENROLLMENTS"]);
        rows.push([
          "Student",
          "University",
          "Course",
          "Campus",
          "Intake",
          "Status",
          "Created",
          "Assessment Date",
          "Assessment Time",
          "Funding Status",
          "Funding Type",
          "Notes",
        ]);
        if (myEnrolls.length === 0) {
          rows.push(["(no enrollments)"]);
        } else {
          for (const e of myEnrolls) {
            rows.push([
              `${e.students?.first_name || ""} ${e.students?.last_name || ""}`.trim(),
              e.universities?.name || "",
              e.courses?.name || "",
              e.campuses?.name || "",
              e.intakes?.label || "",
              e.status || "",
              e.created_at ? new Date(e.created_at).toISOString().split("T")[0] : "",
              e.assessment_date || "",
              e.assessment_time || "",
              e.funding_status || "",
              e.funding_type || "",
              e.notes || "",
            ]);
          }
        }

        valueWrites.push({
          range: `'${tabTitle.replace(/'/g, "''")}'!A1`,
          values: rows,
        });
      }

      // Write in chunks of 5 ranges to be safe
      for (let i = 0; i < valueWrites.length; i += 5) {
        await writeValues(
          accessToken,
          spreadsheetId,
          valueWrites.slice(i, i + 5)
        );
      }

      results.push({
        admin: adminName,
        spreadsheet_id: spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        agents_count: teamAgents.length,
        students_count: teamAgents.reduce(
          (acc: number, a: any) =>
            acc + students.filter((s: any) => s.agent_id === a.id).length,
          0
        ),
      });
    }

    return new Response(
      JSON.stringify({ success: true, sheets: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("export-to-sheets error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

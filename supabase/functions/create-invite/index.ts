import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const [{ data: adminRow }, { data: profileRow }] = await Promise.all([
      adminClient.from("admins").select("user_id").eq("user_id", userData.user.id).maybeSingle(),
      adminClient.from("profiles").select("id, is_admin").eq("id", userData.user.id).maybeSingle(),
    ]);
    if (!adminRow && !profileRow?.is_admin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: jsonHeaders });
    }

    const payload = await req.json();
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
    const maxUses = payload?.maxUses;
    const note = typeof payload?.note === "string" ? payload.note.trim() : "";
    if ((email && !email.includes("@")) || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
      return new Response(JSON.stringify({ error: "Invalid invite details" }), { status: 400, headers: jsonHeaders });
    }

    const tokenBytes = new Uint8Array(16);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { error: insertError } = await adminClient.from("invites").insert({
      token,
      email: email || null,
      created_by: userData.user.id,
      max_uses: maxUses,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      note,
    });

    if (insertError) {
      console.error("create-invite database error:", insertError);
      return new Response(JSON.stringify({ error: "Could not create invite." }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ token }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("create-invite error:", error);
    return new Response(JSON.stringify({ error: "Could not create invite." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

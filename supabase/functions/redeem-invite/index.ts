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
    const { token, email, password, fullName } = await req.json();

    if (!token || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Validate the invite token
    const { data: inviteData, error: inviteError } = await adminClient
      .from("invites")
      .select("id, email, max_uses, use_count, revoked, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (inviteError || !inviteData) {
      return new Response(
        JSON.stringify({ error: "This invite is no longer valid." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (inviteData.revoked) {
      return new Response(
        JSON.stringify({ error: "This invite has been revoked." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(inviteData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invite has expired." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (inviteData.use_count >= inviteData.max_uses) {
      return new Response(
        JSON.stringify({ error: "This invite has reached its usage limit." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If invite has a specific email, the signup email must match
    const normalizedEmail = email.trim().toLowerCase();
    if (inviteData.email && inviteData.email.toLowerCase() !== normalizedEmail) {
      return new Response(
        JSON.stringify({ error: "This invite is for a different email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const userExists = (existingUsers?.users ?? []).some(
      (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
    );

    if (userExists) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user with the service role key
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });

    if (createError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Could not create your account. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atomically increment the invite use count
    const { data: incrementedId } = await adminClient.rpc("increment_invite_use", { p_token: token });

    if (!incrementedId) {
      // The invite was consumed by a concurrent request — delete the user we just created
      await adminClient.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: "This invite is no longer valid." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record which invite the user came from
    await adminClient
      .from("profiles")
      .update({ invite_id: incrementedId })
      .eq("id", userData.user.id);

    return new Response(
      JSON.stringify({ success: true, message: "Account created. You can now sign in." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

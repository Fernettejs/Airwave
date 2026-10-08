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
    const { type, to, inviteToken, requestDetails, adminEmail } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromEmail = Deno.env.get("FROM_EMAIL") ?? "noreply@airwave.cards";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not set — skipping email send");
      return new Response(
        JSON.stringify({ success: false, message: "Email not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject = "";
    let body = "";

    if (type === "approval") {
      const joinLink = `${Deno.env.get("PUBLIC_URL") ?? "https://airwave.cards"}/join?invite=${inviteToken}`;
      subject = "Your AirWave access is approved";
      body = `You're approved! Create your account here:\n\n${joinLink}\n\nThis link expires in 14 days.\n\nAirWave.cards`;
    } else if (type === "admin_notification") {
      subject = "New AirWave access request";
      body = `New access request received:\n\n` +
        `Name: ${requestDetails?.full_name ?? "—"}\n` +
        `Business: ${requestDetails?.business_name ?? "—"}\n` +
        `Trade: ${requestDetails?.trade ?? "—"}\n` +
        `City: ${requestDetails?.city ?? "—"}\n` +
        `Email: ${requestDetails?.email ?? "—"}\n` +
        `Phone: ${requestDetails?.phone ?? "—"}\n` +
        `Referral: ${requestDetails?.referral_source ?? "—"}\n\n` +
        `Review at: ${(Deno.env.get("PUBLIC_URL") ?? "https://airwave.cards")}/admin`;
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown email type." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: type === "admin_notification" ? (adminEmail || to) : to,
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API error:", errText);
      return new Response(
        JSON.stringify({ error: "Could not send email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

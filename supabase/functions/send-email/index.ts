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

    const webhookUrl = Deno.env.get("GHL_EMAIL_WEBHOOK_URL") ?? "";
    const publicUrl = Deno.env.get("PUBLIC_URL") ?? "https://airwave.cards";

    if (!webhookUrl) {
      console.log("GHL_EMAIL_WEBHOOK_URL not set — skipping email send");
      return new Response(
        JSON.stringify({ success: false, message: "Email webhook not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject = "";
    let body = "";
    let recipient = to;

    if (type === "approval") {
      const joinLink = `${publicUrl}/join?invite=${inviteToken}`;
      subject = "Your AirWave access is approved";
      body = `You're approved! Create your account here:\n\n${joinLink}\n\nThis link expires in 14 days.\n\nAirWave.cards`;
    } else if (type === "admin_notification") {
      recipient = adminEmail || to;
      subject = "New AirWave access request";
      body = `New access request received:\n\n` +
        `Name: ${requestDetails?.full_name ?? "—"}\n` +
        `Business: ${requestDetails?.business_name ?? "—"}\n` +
        `Trade: ${requestDetails?.trade ?? "—"}\n` +
        `City: ${requestDetails?.city ?? "—"}\n` +
        `Email: ${requestDetails?.email ?? "—"}\n` +
        `Phone: ${requestDetails?.phone ?? "—"}\n` +
        `Referral: ${requestDetails?.referral_source ?? "—"}\n\n` +
        `Review at: ${publicUrl}/admin`;
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown email type." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        to: recipient,
        subject,
        body,
        inviteToken: inviteToken ?? null,
        requestDetails: requestDetails ?? null,
        source: "airwave-email",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("GHL webhook error:", errText);
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

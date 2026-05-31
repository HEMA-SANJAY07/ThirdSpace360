/**
 * Cloudflare Pages Function: Secure & Fault-Tolerant Form Processor
 * Path: /functions/api/enquiry.js
 * 
 * Flow:
 * 1. CORS Verification (Strict origin locks)
 * 2. Payload Validation & Honeypot detection (bot trap)
 * 3. Cloudflare Turnstile token validation
 * 4. Input Sanitization (Strict HTML Escaping against XSS)
 * 5. Persistent Queue storage inside Cloudflare D1 SQL Database
 * 6. Dual-Channel dispatch (Resend transactional email API + Discord Chat webhook)
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB; // Cloudflare D1 SQL Database binding

  // ----------------------------------------------------
  // 1. STRICT SECURITY: CORS & ORIGIN VERIFICATION
  // ----------------------------------------------------
  const origin = request.headers.get("Origin");
  const allowedOrigins = [
    "https://thirdspace360.in",
    "https://www.thirdspace360.in",
    "https://thirdspace360.pages.dev"
  ];
  
  // Guard: Reject non-white-listed origins in production
  if (env.ENVIRONMENT !== "development") {
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Forbidden: Request origin is unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // ----------------------------------------------------
  // 2. PARSE REQUEST & SHIELD SYSTEM FROM BAD PAYLOADS
  // ----------------------------------------------------
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad Request: Invalid JSON payload structure" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { name, email, phone, space, city, message, honeypot, turnstileToken } = body;

  // ----------------------------------------------------
  // 3. SECURITY: DOUBLE-BLIND HONEYPOT BOT TRAP
  // ----------------------------------------------------
  // Scraper bots auto-fill hidden input fields.
  // We return a fake 200 success to stop the bot from retrying, but drop the execution.
  if (honeypot) {
    console.warn("Honeypot triggered! Suppressed automated spam bot submission.");
    return new Response(JSON.stringify({ success: true, message: "Enquiry logged successfully." }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // ----------------------------------------------------
  // 4. SECURITY: SERVER-SIDE TURNSTILE VALIDATION
  // ----------------------------------------------------
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  
  // Bypass Turnstile check ONLY during local development if secret is not configured
  const shouldSkipTurnstile = env.ENVIRONMENT === "development" && !turnstileSecret;

  if (!shouldSkipTurnstile) {
    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: "Forbidden: Missing security verification token." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ip = request.headers.get("CF-Connecting-IP");
    const verifyForm = new URLSearchParams();
    verifyForm.append("secret", turnstileSecret);
    verifyForm.append("response", turnstileToken);
    if (ip) verifyForm.append("remoteip", ip);

    try {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: verifyForm,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const verifyResult = await verifyRes.json();
      if (!verifyResult.success) {
        return new Response(JSON.stringify({ error: "Security validation failed. Please try again." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch (err) {
      console.error("Turnstile network verification failure:", err);
      // Fail open locally but fail closed in production for security
      if (env.ENVIRONMENT !== "development") {
        return new Response(JSON.stringify({ error: "Verification server unreachable. Retry shortly." }), {
          status: 502,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }

  // ----------------------------------------------------
  // 5. DATA VALIDATION & STRICT SANITIZATION (XSS PROTECTION)
  // ----------------------------------------------------
  if (!name || !name.trim() || !email || !email.trim()) {
    return new Response(JSON.stringify({ error: "Validation Error: Name and Email fields are required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return new Response(JSON.stringify({ error: "Validation Error: Invalid email format." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Crisp Sanitization: Escape special characters to block XSS vector insertion in emails/logs
  const escapeHTML = (rawStr) => {
    if (!rawStr) return "";
    return rawStr
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  };

  const safeName = escapeHTML(name.trim());
  const safeEmail = escapeHTML(email.trim());
  const safePhone = escapeHTML(phone ? phone.trim() : "Not provided");
  const safeSpace = escapeHTML(space ? space.trim() : "Residential");
  const safeCity = escapeHTML(city ? city.trim() : "Not provided");
  const safeMessage = escapeHTML(message ? message.trim() : "No message provided");

  const enquiryId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // ----------------------------------------------------
  // 6. RELIABILITY STEP A: WRITE ENQUIRY TO PERSISTENT SQL DB
  // ----------------------------------------------------
  // We prioritize database writing. If downstream APIs (Resend/Discord) are completely offline,
  // the lead is permanently stored locally and can be recovered by the client.
  if (db) {
    try {
      await db.prepare(
        `INSERT INTO enquiries (id, name, email, phone, space, city, message, created_at, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(enquiryId, safeName, safeEmail, safePhone, safeSpace, safeCity, safeMessage, createdAt, "pending")
      .run();
    } catch (dbError) {
      console.error("D1 SQL Queue Insertion Error:", dbError);
      // Hard crash returning 500 error, prompting the user to submit again, preventing silent loss
      return new Response(JSON.stringify({ error: "Data pipeline transaction failed. Please retry." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  } else {
    console.warn("D1 DB Binding not configured. Skipping local database caching step.");
  }

  // ----------------------------------------------------
  // 7. RELIABILITY STEP B: DUAL-CHANNEL DISPATCH & FAILOVER
  // ----------------------------------------------------
  let emailSent = false;
  let webhookSent = false;
  let logs = [];

  // --- CHANNEL 1: Transactional email via Resend API ---
  const resendApiKey = env.RESEND_API_KEY;
  const clientEmail = env.CLIENT_EMAIL || "studio@thirdspace360.in";
  const fromEmail = env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (resendApiKey) {
    try {
      const emailPayload = {
        from: fromEmail, // Defaults to onboarding@resend.dev for testing without a custom domain
        to: [clientEmail],
        reply_to: safeEmail,
        subject: `New Project Enquiry: ${safeName} (${safeSpace})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2DBCE; border-radius: 4px; background: #FFFDF9; color: #1F1B16;">
            <h2 style="font-family: Georgia, serif; font-weight: normal; color: #8B6A4F; border-bottom: 1px solid rgba(31,27,22,0.08); padding-bottom: 12px; margin-top: 0; font-size: 22px;">
              New Studio Enquiry
            </h2>
            <p style="font-size: 14px; line-height: 1.5; color: #3A332B; margin-bottom: 20px;">
              A potential client has requested a design consultation through the static landing page. Below are the details:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr style="border-bottom: 1px solid rgba(31,27,22,0.04);"><td style="padding: 8px 0; font-weight: 500; width: 140px; color: #6A5F52; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Client Name</td><td style="padding: 8px 0; font-size: 14px;">${safeName}</td></tr>
              <tr style="border-bottom: 1px solid rgba(31,27,22,0.04);"><td style="padding: 8px 0; font-weight: 500; color: #6A5F52; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${safeEmail}" style="color: #8B6A4F; text-decoration: none;">${safeEmail}</a></td></tr>
              <tr style="border-bottom: 1px solid rgba(31,27,22,0.04);"><td style="padding: 8px 0; font-weight: 500; color: #6A5F52; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Phone Number</td><td style="padding: 8px 0; font-size: 14px;">${safePhone}</td></tr>
              <tr style="border-bottom: 1px solid rgba(31,27,22,0.04);"><td style="padding: 8px 0; font-weight: 500; color: #6A5F52; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Space Nature</td><td style="padding: 8px 0; font-size: 14px;">${safeSpace}</td></tr>
              <tr style="border-bottom: 1px solid rgba(31,27,22,0.04);"><td style="padding: 8px 0; font-weight: 500; color: #6A5F52; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">City / Location</td><td style="padding: 8px 0; font-size: 14px;">${safeCity}</td></tr>
            </table>
            
            <div style="padding: 16px; background-color: #EDE7DD; border-radius: 2px; border-left: 3px solid #8B6A4F; margin-bottom: 24px;">
              <h4 style="margin: 0 0 8px 0; color: #8B6A4F; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; font-family: Georgia, serif; font-style: italic;">
                Client's Vision & Aesthetic
              </h4>
              <p style="margin: 0; line-height: 1.6; color: #1F1B16; font-size: 14px; white-space: pre-wrap;">${safeMessage}</p>
            </div>
            
            <p style="margin-top: 32px; font-size: 11px; color: #6A5F52; text-align: center; border-top: 1px solid rgba(31,27,22,0.08); padding-top: 16px;">
              Reference ID: ${enquiryId} | Secure Serverless Edge Dispatcher
            </p>
          </div>
        `
      };

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      if (emailResponse.ok) {
        emailSent = true;
      } else {
        const errorData = await emailResponse.json();
        logs.push(`PAYLOAD: ${JSON.stringify({from: emailPayload.from, to: emailPayload.to})} | ERROR: ${JSON.stringify(errorData)}`);
      }
    } catch (e) {
      logs.push(`Resend integration exception: ${e.message}`);
    }
  } else {
    logs.push("Resend API Key is missing. Skipping email dispatch channel.");
  }

  // --- CHANNEL 2: Real-time notification webhook (Discord / Slack) ---
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookPayload = {
        username: "ThirdSpace360 Concierge",
        avatar_url: "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=128&q=80",
        embeds: [{
          title: "🏡 New Client Space Enquiry",
          color: 9136719, // Clay hex #8B6A4F represented as integer
          fields: [
            { name: "👤 Name", value: safeName, inline: true },
            { name: "✉️ Email", value: safeEmail, inline: true },
            { name: "📞 Phone", value: safePhone, inline: true },
            { name: "✨ Space Type", value: safeSpace, inline: true },
            { name: "📍 Location", value: safeCity, inline: true },
            { name: "📜 Vision", value: safeMessage.length > 1024 ? safeMessage.substring(0, 1021) + "..." : safeMessage }
          ],
          footer: { text: `Queue Reference ID: ${enquiryId}` },
          timestamp: createdAt
        }]
      };

      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload)
      });

      if (webhookResponse.ok) {
        webhookSent = true;
      } else {
        logs.push(`Chat Webhook delivery failure: HTTP Status ${webhookResponse.status}`);
      }
    } catch (e) {
      logs.push(`Chat Webhook exception: ${e.message}`);
    }
  } else {
    logs.push("Discord/Slack Webhook URL is missing. Skipping chat notification channel.");
  }

  // ----------------------------------------------------
  // 8. RELIABILITY STEP C: UPDATE FINAL DELIVERY STATE
  // ----------------------------------------------------
  let finalStatus = "sent";
  if (!emailSent && !webhookSent) {
    finalStatus = "failed_all";
  } else if (!emailSent) {
    finalStatus = "failed_email";
  }

  if (db) {
    try {
      await db.prepare("UPDATE enquiries SET status = ?, attempts = attempts + 1, error_log = ? WHERE id = ?")
        .bind(finalStatus, logs.join(" | "), enquiryId)
        .run();
    } catch (updateDbError) {
      console.error("D1 database update state transaction failure:", updateDbError);
    }
  }

  // ----------------------------------------------------
  // 9. TRANSACTION COMPLETE - RETURN SECURE RESPONSE
  // ----------------------------------------------------
  return new Response(JSON.stringify({ 
    success: true, 
    message: "Enquiry logged successfully.",
    delivery: { email: emailSent, chat: webhookSent }
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "*"
    }
  });
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// GET /api/feedback: allows the site owner to view all received feedback
export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const feedbackFilePath = path.join(dataDir, "feedbacks.json");
    if (!fs.existsSync(feedbackFilePath)) {
      return NextResponse.json({ total: 0, feedbacks: [] });
    }
    const content = fs.readFileSync(feedbackFilePath, "utf8");
    const feedbacks = JSON.parse(content || "[]");
    return NextResponse.json({ total: feedbacks.length, feedbacks });
  } catch (err) {
    console.error("Failed to read feedbacks:", err);
    return NextResponse.json({ error: "Failed to read feedbacks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, email, path: pagePath, userAgent } = body;

    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter a message with at least 2 characters." },
        { status: 400 }
      );
    }

    const feedbackPayload = {
      id: "fb_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      _subject: `[Spellense Feedback: ${(type || "General").toUpperCase()}] from ${pagePath || "/"}`,
      feedbackType: type || "General",
      message: message.trim(),
      userEmail: email && email.trim() ? email.trim() : "Anonymous",
      pageUrl: pagePath || "Unknown URL",
      userAgent: userAgent || "Unknown",
      timestamp: new Date().toISOString(),
      _template: "table",
    };

    console.log("[SPELLENSE FEEDBACK RECEIVED]", feedbackPayload);

    // 1. Persist feedback locally to data/feedbacks.json so it is NEVER lost
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const feedbackFilePath = path.join(dataDir, "feedbacks.json");
      let existingFeedbacks: unknown[] = [];
      if (fs.existsSync(feedbackFilePath)) {
        try {
          const fileContent = fs.readFileSync(feedbackFilePath, "utf8");
          existingFeedbacks = JSON.parse(fileContent);
        } catch {
          existingFeedbacks = [];
        }
      }
      existingFeedbacks.unshift(feedbackPayload);
      fs.writeFileSync(feedbackFilePath, JSON.stringify(existingFeedbacks, null, 2), "utf8");
    } catch (saveErr) {
      console.error("Failed to save feedback to local file:", saveErr);
    }

    // 2. Forward to hello@spellense.com via Resend (or FormSubmit fallback)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        const fromAddress = process.env.FEEDBACK_FROM_EMAIL || "Spellense Feedback <onboarding@resend.dev>";
        const toAddress = process.env.FEEDBACK_TO_EMAIL || "hello@spellense.com";

        await resend.emails.send({
          from: fromAddress,
          to: toAddress,
          replyTo: email && email.trim() ? email.trim() : undefined,
          subject: feedbackPayload._subject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
                New Feedback: ${(type || "General").toUpperCase()}
              </h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; width: 100px;">From:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${email && email.trim() ? email.trim() : "Anonymous"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Page:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${pagePath || "/"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Time:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
              <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 6px; margin: 15px 0;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
              </div>
              <p style="color: #94a3b8; font-size: 11px; margin-top: 25px; margin-bottom: 0;">
                User Agent: ${userAgent || "Unknown"} • ID: ${feedbackPayload.id}
              </p>
            </div>
          `,
        });
        console.log("[SPELLENSE FEEDBACK] Dispatched via Resend successfully");
      } catch (resendErr) {
        console.error("[SPELLENSE FEEDBACK] Resend delivery error:", resendErr);
      }
    } else {
      // Fallback to FormSubmit if RESEND_API_KEY is not yet configured
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch("https://formsubmit.co/ajax/hello@spellense.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Referer: "https://spellense.com",
            Origin: "https://spellense.com",
          },
          body: JSON.stringify(feedbackPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const result = await response.json().catch(() => null);
        if (!response.ok || (result && result.success === "false")) {
          console.warn("FormSubmit notice:", result?.message || response.statusText);
        }
      } catch (forwardErr) {
        console.warn("Note: FormSubmit forward skipped (saved locally):", (forwardErr as Error).message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Feedback received successfully",
      savedLocally: true,
    });
  } catch (error) {
    console.error("Feedback route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, email, path: pagePath, userAgent } = body;

    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const feedbackPayload = {
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

    // 1. Persist feedback locally to data/feedbacks.json so it is never lost
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
      existingFeedbacks.push(feedbackPayload);
      fs.writeFileSync(feedbackFilePath, JSON.stringify(existingFeedbacks, null, 2), "utf8");
    } catch (saveErr) {
      console.error("Failed to save feedback to local file:", saveErr);
    }

    // 2. Forward to hello@spellense.com via FormSubmit AJAX service
    try {
      const response = await fetch("https://formsubmit.co/ajax/hello@spellense.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Referer: "https://spellense.com",
          Origin: "https://spellense.com",
        },
        body: JSON.stringify(feedbackPayload),
      });

      const result = await response.json().catch(() => null);
      console.log("[FORMSUBMIT RESPONSE]", result);

      if (!response.ok || (result && result.success === "false")) {
        console.warn("FormSubmit notice:", result?.message || response.statusText);
      }
    } catch (forwardErr) {
      console.error("Failed to forward feedback to email service:", forwardErr);
    }

    return NextResponse.json({
      success: true,
      message: "Feedback received successfully",
    });
  } catch (error) {
    console.error("Feedback route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

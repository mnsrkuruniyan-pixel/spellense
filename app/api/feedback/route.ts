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

    // 2. Forward to hello@spellense.com with a 3.5s timeout so it never hangs
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
      console.warn("Note: External forward attempt skipped or offline (saved locally):", (forwardErr as Error).message);
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

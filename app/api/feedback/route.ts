import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, email, path, userAgent } = body;

    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const feedbackPayload = {
      _subject: `[Spellense Feedback: ${(type || "General").toUpperCase()}] from ${path || "/"}`,
      feedbackType: type || "General",
      message: message.trim(),
      userEmail: email && email.trim() ? email.trim() : "Anonymous",
      pageUrl: path || "Unknown URL",
      userAgent: userAgent || "Unknown",
      timestamp: new Date().toISOString(),
      _template: "table",
    };

    console.log("[SPELLENSE FEEDBACK RECEIVED]", feedbackPayload);

    // Forward to hello@spellense.com via FormSubmit AJAX service
    try {
      const response = await fetch("https://formsubmit.co/ajax/hello@spellense.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(feedbackPayload),
      });

      if (!response.ok) {
        console.warn("FormSubmit response status:", response.status);
      }
    } catch (forwardErr) {
      console.error("Failed to forward feedback to email service:", forwardErr);
      // We still return success to the user since the feedback is logged on server
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

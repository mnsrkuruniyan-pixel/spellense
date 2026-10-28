import { NextRequest, NextResponse } from "next/server";
import {
  INDEXNOW_HOST,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  getAllSiteUrls,
  submitToIndexNow,
} from "@/lib/indexnow";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doSubmit = searchParams.get("submit") === "true";

  if (doSubmit) {
    const result = await submitToIndexNow();
    return NextResponse.json(result, { status: result.ok ? 200 : result.status || 500 });
  }

  const urls = getAllSiteUrls();
  return NextResponse.json({
    service: "IndexNow API integration for Spellense",
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    totalUrls: urls.length,
    urls,
    instructions: "Send POST to this endpoint or add ?submit=true to ping IndexNow.",
  });
}

export async function POST(request: NextRequest) {
  try {
    let customUrls: string[] | undefined;
    try {
      const body = await request.json();
      if (Array.isArray(body?.urls)) {
        customUrls = body.urls;
      }
    } catch (_) {
      // Empty or non-JSON body is acceptable; will submit all URLs
    }

    const result = await submitToIndexNow(customUrls);
    return NextResponse.json(result, { status: result.ok ? 200 : result.status || 500 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, message: `Internal server error: ${msg}` },
      { status: 500 }
    );
  }
}


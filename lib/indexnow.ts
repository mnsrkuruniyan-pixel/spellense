import { getAllPosts } from "@/lib/blog";

export const INDEXNOW_KEY = "2a9361579354a2153ca85213978df1d9";
export const INDEXNOW_HOST = "spellense.com";
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

/**
 * Returns all static and dynamic public URLs for Spellense.
 */
export function getAllSiteUrls(): string[] {
  const baseUrl = `https://${INDEXNOW_HOST}`;

  const staticRoutes = [
    "",
    "/flipbook",
    "/pdf-studio",
    "/image-compressor",
    "/print-sheet-maker",
    "/qr-code-generator",
    "/image-to-text",
    "/case-converter",
    "/us-uk-converter",
    "/design-check",
    "/blog",
    "/about",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
  ];

  const blogUrls = getAllPosts().map((post) => `/blog/${post.slug}`);

  const allPaths = [...staticRoutes, ...blogUrls];

  return Array.from(new Set(allPaths.map((p) => (p === "" ? baseUrl : `${baseUrl}${p}`))));
}

export interface IndexNowSubmitResult {
  ok: boolean;
  status: number;
  statusText: string;
  submittedCount: number;
  urls: string[];
  message: string;
}

/**
 * Submits URL list to IndexNow API (Bing, Yandex, Seznam, Naver, etc.)
 */
export async function submitToIndexNow(customUrls?: string[]): Promise<IndexNowSubmitResult> {
  const urlList = customUrls && customUrls.length > 0 ? customUrls : getAllSiteUrls();

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const ok = res.status === 200 || res.status === 202;
    const message =
      res.status === 200
        ? "OK: URLs successfully submitted and indexed."
        : res.status === 202
        ? "Accepted: URL received. IndexNow key validation pending."
        : `IndexNow returned status ${res.status}: ${res.statusText}`;

    return {
      ok,
      status: res.status,
      statusText: res.statusText,
      submittedCount: urlList.length,
      urls: urlList,
      message,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 500,
      statusText: "Network/Fetch Error",
      submittedCount: urlList.length,
      urls: urlList,
      message: `Failed to ping IndexNow: ${errorMsg}`,
    };
  }
}

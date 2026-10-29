#!/usr/bin/env node

/**
 * CLI script to submit Spellense URLs directly to IndexNow (Bing, Yandex, etc.)
 * Run with: npm run indexnow
 */

const KEY = "2a9361579354a2153ca85213978df1d9";
const HOST = "spellense.com";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS = [
  "https://spellense.com/",
  "https://spellense.com/flipbook",
  "https://spellense.com/image-compressor",
  "https://spellense.com/print-sheet-maker",
  "https://spellense.com/qr-code-generator",
  "https://spellense.com/image-to-text",
  "https://spellense.com/case-converter",
  "https://spellense.com/us-uk-converter",
  "https://spellense.com/design-check",
  "https://spellense.com/blog",
  "https://spellense.com/blog/how-to-check-spelling-in-canva-before-publishing",
  "https://spellense.com/blog/how-to-convert-pdf-to-3d-flipbook",
  "https://spellense.com/blog/how-to-find-spelling-mistakes-in-scanned-pdf",
  "https://spellense.com/blog/how-to-convert-photo-to-text",
  "https://spellense.com/blog/why-normal-spell-checkers-miss-typos-in-images",
  "https://spellense.com/blog/why-is-the-letter-u-dropped-in-color",
  "https://spellense.com/about",
  "https://spellense.com/faq",
  "https://spellense.com/contact",
  "https://spellense.com/privacy",
  "https://spellense.com/terms",
];

async function main() {
  console.log(`[IndexNow] Preparing submission for ${HOST}...`);
  console.log(`[IndexNow] Key: ${KEY}`);
  console.log(`[IndexNow] Key location: ${KEY_LOCATION}`);
  console.log(`[IndexNow] Total URLs to ping: ${URLS.length}`);

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: URLS,
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    console.log(`[IndexNow] Response HTTP status: ${res.status} ${res.statusText}`);

    if (res.status === 200) {
      console.log(`[IndexNow] ✅ Success! All ${URLS.length} URLs submitted and accepted.`);
    } else if (res.status === 202) {
      console.log(`[IndexNow] ⏳ Accepted (202): URLs received. IndexNow key validation pending deployment.`);
    } else {
      const text = await res.text().catch(() => "");
      console.error(`[IndexNow] ⚠️ Note (${res.status}): ${text || res.statusText}`);
    }
  } catch (err) {
    console.error("[IndexNow] ❌ Network request failed:", err.message);
  }
}

main();


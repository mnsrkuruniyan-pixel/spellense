// Accuracy harness: generates synthetic designs with KNOWN defects, sends them to the running API,
// and reports detection rate (recall) per defect type plus false-alarm rate on clean designs.
//
//   npm i -D @napi-rs/canvas        (already a dependency of the app)
//   npm run dev                      (in another terminal)
//   node scripts/eval-design-check.mjs [http://localhost:3000] [samplesPerCase=8]
//
// Re-run after every change to the detection logic and compare the numbers.
import { createCanvas } from "@napi-rs/canvas";

const BASE = process.argv[2] || "http://localhost:3000";
const N = Number(process.argv[3]) || 8;
const W = 1200, H = 800;
const HEADLINES = ["Receive our best offer", "Summer collection launch", "Discover quality furniture", "Book your appointment today", "Limited time seasonal sale"];
const BODY = ["Visit our showroom for premium designs", "Free delivery on every order this month", "Friendly team ready to help you"];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

function design({ headline, bodyColor = "#111111", headColor = "#111111", headX = 120, typo = false, misalign = false }) {
  const c = createCanvas(W, H), x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  x.textBaseline = "top";
  x.fillStyle = headColor; x.font = "bold 72px sans-serif";
  x.fillText(typo ? headline.replace("Receive", "Recieve").replace("Discover", "Discuver").replace("quality", "qualty") : headline, headX, 140);
  x.fillStyle = bodyColor; x.font = "34px sans-serif";
  BODY.forEach((t, i) => x.fillText(t, 120 + (misalign && i === 1 ? 14 : 0), 320 + i * 60));
  return c.toBuffer("image/png");
}

const CASES = {
  clean:        { expect: null,       make: () => design({ headline: rnd(HEADLINES.filter((h) => !/Receive|Discover|quality/.test(h))) }) },
  typo:         { expect: "copy",     make: () => design({ headline: rnd(["Receive our best offer", "Discover quality furniture"]), typo: true }) },
  low_contrast: { expect: "contrast", make: () => design({ headline: rnd(HEADLINES.slice(1, 3)), bodyColor: "#d0d0d0", headColor: "#c8c8c8" }) },
  margin:       { expect: "margin",   make: () => design({ headline: "Summer collection launch", headX: 4 }) },
  misaligned:   { expect: "layout",   make: () => design({ headline: "Summer collection launch", misalign: true }) },
};

async function check(png) {
  const fd = new FormData();
  fd.append("file", new Blob([png], { type: "image/png" }), "t.png");
  const r = await fetch(`${BASE}/api/design-check`, { method: "POST", body: fd });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || r.status);
  return j.issues.map((i) => i.category);
}

const rows = [];
let cleanFalseAlarms = 0, cleanN = 0;
for (const [name, cs] of Object.entries(CASES)) {
  let hit = 0;
  for (let i = 0; i < N; i++) {
    const cats = await check(cs.make());
    if (cs.expect) { if (cats.includes(cs.expect)) hit++; }
    else { cleanN++; if (cats.some((c) => ["copy", "contrast", "margin"].includes(c))) cleanFalseAlarms++; }
  }
  rows.push({ case: name, expected: cs.expect ?? "(no issue)", result: cs.expect ? `${hit}/${N} detected` : `${cleanFalseAlarms}/${cleanN} false alarms` });
}
console.table(rows);

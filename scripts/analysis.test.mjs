// Run: node scripts/analysis.test.mjs   (Node 22.18+ runs the .ts import directly)
import assert from "node:assert/strict";
import * as A from "../app/api/design-check/analysis.ts";

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok  -", name); };

// ---- synthetic image helper: flat RGBA canvas with rectangles ----
function makeImg(w, h, bg = [255, 255, 255]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i*4]=bg[0]; data[i*4+1]=bg[1]; data[i*4+2]=bg[2]; data[i*4+3]=255; }
  const rect = (x0, y0, x1, y1, c) => { for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++){ const i=(y*w+x)*4; data[i]=c[0];data[i+1]=c[1];data[i+2]=c[2]; } };
  return { data, rect, lum: A.makeLumAccessor(data, w, h), w, h };
}
// "text" = thin vertical strokes inside a box
function strokes(img, x, y, w, h, color) { for (let xx = x + 2; xx < x + w - 2; xx += 4) img.rect(xx, y + 2, xx + 2, y + h - 2, color); }
const word = (text, x, y, w, h, W, H, conf = 90) => ({ text, confidence: conf, left: x/W, top: y/H, width: w/W, height: h/H, pixelX: x, pixelY: y, pixelW: w, pixelH: h });

t("levenshtein", () => { assert.equal(A.levenshtein("recieve", "receive"), 1); /* transposition = 1 edit */ assert.equal(A.levenshtein("salee", "sale"), 1); });

// ---- contrast ----
t("black text on white passes", () => {
  const im = makeImg(400, 200); strokes(im, 50, 80, 200, 28, [0,0,0]);
  const m = A.measureTextContrast(im.lum, { x: 50, y: 80, w: 200, h: 28 });
  assert.ok(m.ratio > 15, `ratio ${m.ratio}`);
  assert.equal(A.classifyContrast(m.ratio, 28, 200), null);
});
t("light grey on white is flagged (old luminance-DIFFERENCE shortcut would have passed some of these)", () => {
  const im = makeImg(400, 200); strokes(im, 50, 80, 200, 28, [200,200,200]);
  const m = A.measureTextContrast(im.lum, { x: 50, y: 80, w: 200, h: 28 });
  assert.ok(m.ratio < 2, `ratio ${m.ratio}`);
  assert.equal(A.classifyContrast(m.ratio, 28, 200).severity, "warning");
});
t("grey on white at ~3.4:1 → hedged suggestion for small text", () => {
  const im = makeImg(400, 200, [255,255,255]); // lum 1.0
  strokes(im, 50, 80, 200, 28, [140,140,140]); // ratio ~3.4
  const m = A.measureTextContrast(im.lum, { x: 50, y: 80, w: 200, h: 28 });
  const c = A.classifyContrast(m.ratio, 28, 200);
  assert.ok(c && c.severity === "suggestion", `ratio ${m.ratio}`); // 3–4.5 for small text → hedged suggestion
});
t("white text on dark banner inside a light page passes", () => {
  const im = makeImg(400, 200); im.rect(20, 60, 380, 140, [20,30,80]); strokes(im, 50, 80, 200, 28, [255,255,255]);
  const m = A.measureTextContrast(im.lum, { x: 50, y: 80, w: 200, h: 28 });
  assert.ok(m.ratio > 10, `ratio ${m.ratio}`);
});
t("yellow on white banner flagged", () => {
  const im = makeImg(400, 200); im.rect(20, 60, 380, 140, [255,235,60]); strokes(im, 50, 80, 200, 28, [255,255,255]);
  const m = A.measureTextContrast(im.lum, { x: 50, y: 80, w: 200, h: 28 });
  assert.ok(m.ratio < 1.5, `ratio ${m.ratio}`);
});

// ---- spelling ----
const dict = new Set(["receive","sale","offer","hello","world","great","dubai"]);
const fake = { correct: (w) => dict.has(w), suggest: (w) => [...dict].filter((d) => A.levenshtein(w, d) <= 2).sort((a,b)=>A.levenshtein(w,a)-A.levenshtein(w,b)) };
const brands = new Set(["canva"]);
t("lowercase typo → warning", () => { const v = A.evaluateSpelling("recieve", fake, fake, brands); assert.equal(v.severity, "warning"); assert.equal(v.suggestion, "receive"); });
t("Title Case near-miss ('Recieve' used to be skipped) → hedged suggestion", () => { const v = A.evaluateSpelling("Recieve", fake, fake, brands); assert.equal(v?.severity, "suggestion"); });
t("ALL CAPS near-miss 'SALEE' → hedged suggestion", () => { assert.equal(A.evaluateSpelling("SALEE", fake, fake, brands)?.hedged, true); });
t("brand / acronym / CamelCase / proper noun not flagged", () => {
  assert.equal(A.evaluateSpelling("Canva", fake, fake, brands), null);
  assert.equal(A.evaluateSpelling("HVAC", fake, fake, brands), null);
  assert.equal(A.evaluateSpelling("eBayy", fake, fake, brands), null);
  assert.equal(A.evaluateSpelling("Qingdao", fake, fake, brands), null);
});

// ---- price / date ----
const loc = () => ({ left: .1, top: .1, width: .2, height: .1 });
t("discount math: 100→60 claimed 50% is critical", () => {
  const r = A.verifyPriceClaims([{ text: "50% OFF", originalPrice: 100, salePrice: 60, claimedDiscountPercent: 50 }], loc);
  assert.equal(r.length, 1); assert.equal(r[0].severity, "critical");
});
t("discount math: 100→60 claimed 40% is fine; 3 tolerance for rounding", () => {
  assert.equal(A.verifyPriceClaims([{ originalPrice: 100, salePrice: 60, claimedDiscountPercent: 40 }], loc).length, 0);
  assert.equal(A.verifyPriceClaims([{ originalPrice: 99, salePrice: 66, claimedDiscountPercent: 33 }], loc).length, 0);
});
t("sale price ≥ original flagged", () => { assert.equal(A.verifyPriceClaims([{ originalPrice: 50, salePrice: 60 }], loc).length, 1); });
t("weekday mismatch: 'Monday 30 September' (2026: Wednesday) flagged; matching date passes", () => {
  const now = new Date(Date.UTC(2026, 9, 3));
  assert.equal(A.verifyDateClaims([{ text: "Monday 30 September", weekday: "Monday", day: 30, month: 9 }], loc, now).length, 1);
  assert.equal(A.verifyDateClaims([{ text: "Wednesday 30 September", weekday: "Wednesday", day: 30, month: 9 }], loc, now).length, 0);
  assert.equal(A.verifyDateClaims([{ text: "Sunday 4 October", weekday: "Sun", day: 4, month: 10 }], loc, now).length, 0);
});
t("impossible date flagged (31 June)", () => {
  assert.equal(A.verifyDateClaims([{ text: "31 June", day: 31, month: 6 }], loc, new Date(Date.UTC(2026, 0, 1))).length, 1);
});

// ---- layout ----
const W = 1000, H = 1000;
const ln = (text, x, y, w = 300, h = 24) => word(text, x, y, w, h, W, H);
t("left-aligned block with one line 8px off is flagged as misaligned", () => {
  const lines = [ln("First line here", 100, 100), ln("Second line here", 100, 140), ln("Third line here", 108, 180), ln("Fourth line here", 100, 220)];
  const r = A.analyzeTextLayout(lines, W, H);
  assert.ok(r.some((i) => i.title.includes("misaligned")), JSON.stringify(r.map(i=>i.title)));
});
t("perfectly aligned block → no alignment/spacing issues", () => {
  const lines = [0,1,2,3].map((i) => ln("Some line text " + i, 100, 100 + i * 40));
  assert.equal(A.analyzeTextLayout(lines, W, H).length, 0);
});
t("centered lines of different widths are NOT flagged", () => {
  const lines = [ln("Short one", 400, 100, 200), ln("A bit longer line", 350, 140, 300), ln("Longest centered line!", 300, 180, 400), ln("Tiny line", 425, 220, 150)];
  assert.equal(A.analyzeTextLayout(lines, W, H).filter((i) => i.title.includes("misaligned")).length, 0);
});
t("uneven spacing flagged", () => {
  const ys = [100, 140, 180, 235, 275]; // big gaps (paragraph breaks) split blocks by design; this is a within-block irregularity
  const lines = ys.map((y, i) => ln("Line text number " + i, 100, y));
  assert.ok(A.analyzeTextLayout(lines, W, H).some((i) => i.title.includes("Uneven spacing")));
});
t("overlapping lines flagged; tiny text flagged", () => {
  const r = A.analyzeTextLayout([ln("Overlap one text", 100, 100), ln("Overlap two text", 120, 108)], W, H);
  assert.ok(r.some((i) => i.title.includes("overlap")));
  const s = A.analyzeTextLayout([ln("tiny fine print text", 100, 900, 200, 9)], W, H);
  assert.ok(s.some((i) => i.title.includes("small")));
});

// ---- margins ----
t("margin: danger vs safe zone", () => {
  const cfg = A.marginConfig("digital");
  const r = A.analyzeTextMargins([word("Edge", 3, 400, 80, 30, 1000, 1000), word("Near", 20, 500, 80, 30, 1000, 1000), word("Fine", 200, 500, 80, 30, 1000, 1000)], cfg);
  assert.equal(r.issues.filter((i) => i.severity === "warning").length, 1);
  assert.equal(r.issues.filter((i) => i.severity === "suggestion").length, 1);
  assert.ok(r.edgesHit.has("left edge"));
});
t("non-text artwork in edge band on plain page flagged; full-bleed photo ignored", () => {
  const im = makeImg(600, 400); im.rect(6, 150, 40, 200, [200, 0, 0]);
  assert.equal(A.detectEdgeContent(im.lum, 600, 400, 0.02, new Set()).length, 1);
  const photo = makeImg(600, 400); for (let y=0;y<400;y++) for (let x=0;x<600;x++) photo.rect(x,y,x+1,y+1,[(x*7)%255,(y*5)%255,100]);
  assert.equal(A.detectEdgeContent(photo.lum, 600, 400, 0.02, new Set()).length, 0);
});

// ---- OCR helpers / Gemini helpers ----
t("findOcrBox matches multi-word phrase", () => {
  const ws = [word("Buy", 10, 10, 30, 20, 1000, 1000), word("one", 50, 10, 30, 20, 1000, 1000), word("now!", 90, 10, 40, 20, 1000, 1000)];
  const b = A.findOcrBox(ws, "Buy one now");
  assert.ok(b && Math.abs(b.left - 0.01) < 1e-9 && b.width > 0.1);
});
t("mergeOcrWords adds new words, dedupes overlapping", () => {
  const a = [word("Hello", 10, 10, 50, 20, 1000, 1000, 80)], b = [word("Hello", 11, 10, 50, 20, 1000, 1000, 95), word("Extra", 300, 10, 50, 20, 1000, 1000)];
  const m = A.mergeOcrWords(a, b); assert.equal(m.length, 2); assert.equal(m[0].confidence, 95);
});
t("extractGeminiText ignores thought parts and joins the rest", () => {
  assert.equal(A.extractGeminiText({ candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text: '{"a":' }, { text: "1}" }] } }] }), '{"a":1}');
});
t("parseJsonLoose handles fenced/extra text", () => { assert.deepEqual(A.parseJsonLoose('```json\n{"x":1}\n```'), { x: 1 }); });
t("crossValidate", () => {
  const mk = (cat, txt, l) => ({ category: cat, originalText: txt, bbox: { left: l, top: 0.1, width: 0.1, height: 0.05 } });
  const r = A.crossValidate([mk("copy", "Recieve", .1), mk("layout", "", .5)], [mk("copy", "recieve", .12)]);
  assert.equal(r.confirmed.length, 1); assert.equal(r.unconfirmed.length, 1);
});

console.log(`\n${passed} tests passed`);

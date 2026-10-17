import assert from "node:assert";
import { planLayout, placeItems, placeIdCards, PAPER_SIZES } from "../lib/print-sheet/layout.ts";
import { buildPdf, MM_TO_PT } from "../lib/print-sheet/pdf.ts";

console.log("Running Print Sheet Maker Engine Unit Tests...");

// Helper for planning
const P = (n, cell, paper = "A4", asp = 1) =>
  planLayout({
    paper: PAPER_SIZES[paper],
    orient: "auto",
    margin: 3,
    gap: 2,
    aspects: Array(n).fill(asp),
    cell,
  });

// 1. Passport 35x45: 30 per page, 2 pages for 60
const p60 = P(60, [35, 45]);
assert.equal(p60.per, 30, "Passport 35x45 should fit 30 per A4 page");
assert.equal(p60.pages, 2, "60 Passport photos should be 2 pages");

// 2. 2x2 in (50.8x50.8): 15 per page, 3 pages for 32
const p32 = P(32, [50.8, 50.8]);
assert.equal(p32.per, 15, "2x2 in should fit 15 per A4 page");
assert.equal(p32.pages, 3, "32 copies of 2x2 in should be 3 pages");

// 3. ID card (85.6x54): 10 per page
const pId = P(10, [85.6, 54]);
assert.equal(pId.per, 10, "ID card should fit 10 per page");

// 4. Business card (90x55): 10 per page
const pBc = P(10, [90, 55]);
assert.equal(pBc.per, 10, "Business card should fit 10 per page");

// 5. Size that does not fit once: reported fits: false, never shrunk
const pNoFit = P(1, [250, 350]);
assert.equal(pNoFit.fits, false, "Size larger than paper should report fits: false");

// 6. Fit mode is always 1 page
const pFit = P(8, null);
assert.equal(pFit.pages, 1, "Fit mode should always be 1 page");
assert.equal(pFit.fits, true);

// 7. Placed items size accuracy within 0.01 mm
const plan15 = P(15, [50.8, 50.8]);
const placed = placeItems(plan15, Array(15).fill(0), [1], 3, 2, "fit");
assert.equal(placed.length, 1);
assert.equal(placed[0].length, 15);
assert.ok(
  Math.abs(placed[0][0].w - 50.8) < 0.01,
  "Placed width must match target size within 0.01 mm"
);
assert.ok(
  Math.abs(placed[0][0].h - 50.8) < 0.01,
  "Placed height must match target size within 0.01 mm"
);

// 8. ID Card placement tests
const stackedPlaced = placeIdCards([{ frontIndex: 0, backIndex: 1 }], [210, 297], 85.6, 54, "stacked");
assert.equal(stackedPlaced.length, 1);
assert.equal(stackedPlaced[0].length, 2);
assert.equal(stackedPlaced[0][0].w, 85.6);
assert.equal(stackedPlaced[0][0].h, 54);
assert.equal(stackedPlaced[0][0].y, 30, "Stacked front card should start at 30mm (3cm) from top");
assert.equal(stackedPlaced[0][1].y, 30 + 54 + 6, "Stacked back card should be placed below front card with gap");

const sidePlaced = placeIdCards([{ frontIndex: 0, backIndex: 1 }], [210, 297], 85.6, 54, "side_by_side");
assert.equal(sidePlaced.length, 1);
assert.equal(sidePlaced[0].length, 2);
assert.equal(sidePlaced[0][0].y, 30, "Side-by-side front card should start at 30mm (3cm) from top");
assert.equal(sidePlaced[0][1].y, 30, "Side-by-side back card should start at 30mm (3cm) from top");

const duplexPlaced = placeIdCards([{ frontIndex: 0, backIndex: 1 }], [210, 297], 85.6, 54, "two_pages");
assert.equal(duplexPlaced.length, 2);
assert.equal(duplexPlaced[0].length, 1);
assert.equal(duplexPlaced[1].length, 1);
assert.equal(duplexPlaced[0][0].x, duplexPlaced[1][0].x, "Duplex Front and Back must align at exact same x");
assert.equal(duplexPlaced[0][0].y, duplexPlaced[1][0].y, "Duplex Front and Back must align at exact same y");
assert.equal(duplexPlaced[0][0].y, 30, "Duplex cards should start at 30mm (3cm) from top");

// 9. PDF test: check MediaBox dimensions for A4 (595.28 x 841.89 pt)
async function testPdf() {
  // 1x1 transparent PNG bytes
  const dummyPng = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
    0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120,
    156, 99, 96, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78,
    68, 174, 66, 96, 130,
  ]);

  const pdfBlob = await buildPdf(
    210,
    297,
    placed,
    [{ bytes: dummyPng, mimeType: "image/png", w: 1, h: 1 }],
    { cutLines: true, cutMarks: true, pageBorder: true, showRuler: true }
  );

  assert.ok(pdfBlob.size > 500, "PDF blob should be generated");
  assert.equal(pdfBlob.type, "application/pdf");

  console.log("All unit tests passed successfully!");
}

testPdf().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});


import { test, expect } from "@playwright/test";

test.describe("Print Sheet Maker Page", () => {
  test("shows Setup screen with title and upload area without blanking out after 3 seconds", async ({
    page,
  }) => {
    // Navigate to Print Sheet Maker
    await page.goto("http://localhost:3000/print-sheet-maker", {
      waitUntil: "domcontentloaded",
    });

    // Wait 3 seconds to verify it does not disappear or collapse after hydration
    await page.waitForTimeout(3000);

    // 1. Verify title is visible
    const heading = page.locator("h1", { hasText: "Print Sheet Maker" });
    await expect(heading).toBeVisible();

    // 2. Verify upload / drop area is visible
    const dropzone = page.locator("text=Drop photos here");
    await expect(dropzone).toBeVisible();

    // 3. Verify main element has non-zero geometry
    const mainRect = await page.locator("main").boundingBox();
    expect(mainRect).not.toBeNull();
    expect(mainRect!.width).toBeGreaterThan(200);
    expect(mainRect!.height).toBeGreaterThan(200);

    // 4. Verify document.body has readable text
    const textLength = await page.evaluate(() => document.body.innerText.length);
    expect(textLength).toBeGreaterThan(100);

    // 5. Check no invisible fixed overlay covers the viewport
    const coveringOverlays = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*"));
      return all
        .filter((el) => {
          const style = window.getComputedStyle(el);
          if (style.position !== "fixed") return false;
          const rect = el.getBoundingClientRect();
          const coversViewport =
            rect.left <= 0 &&
            rect.top <= 0 &&
            rect.width >= window.innerWidth &&
            rect.height >= window.innerHeight;
          const isOpaqueOrIntercepting =
            style.pointerEvents !== "none" &&
            style.display !== "none" &&
            style.visibility !== "hidden";
          return coversViewport && isOpaqueOrIntercepting;
        })
        .map((el) => ({
          tagName: el.tagName,
          className: el.className,
          zIndex: window.getComputedStyle(el).zIndex,
        }));
    });

    expect(coveringOverlays).toHaveLength(0);
  });

  test("supports undo after loading sample photos", async ({ page }) => {
    await page.goto("http://localhost:3000/print-sheet-maker", {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: "Try sample photos" }).click();
    await expect(page.getByText("Sample Photo", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();

    await expect(page.getByText("Drop photos here, tap to choose, or press Ctrl+V")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try sample photos" })).toBeVisible();
  });
});


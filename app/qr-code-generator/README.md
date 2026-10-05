# Spellense — QR Code Generator with Scannability Check

Self-contained page: `index.html` + `style.css` + `script.js`.
No build step, no npm install — everything loads via CDN (`qr-code-styling` for generation/export, `jsQR` for the scannability decode test).

## To integrate into spellense.com

1. Drop these 3 files into the new route, e.g. `/qr-code-generator/`.
2. Update in `index.html` `<head>`:
   - `og:image` — point to a real 1200×630 preview image once one exists.
   - If this page will live inside the existing site shell (shared header/nav/footer), wrap the `<main>` content into that shell instead of using this file's bare `<body>`.
3. The canonical URL and JSON-LD `url` fields already assume `https://spellense.com/qr-code-generator` — change if the final path differs.
4. Fonts are pulled from Google Fonts (`Plus Jakarta Sans` + `Inter`) to match the rest of the site's style — swap for self-hosted fonts if that's the site convention.

## How the scannability check works

- **Contrast** — WCAG relative-luminance contrast ratio between the chosen QR color and background, floor set at 4.5:1.
- **Logo safety** — compares the logo's area ratio against safe maximums per error-correction level (L/M/Q/H) in `CONFIG.MAX_LOGO_RATIO`.
- **Minimum print size** — simple distance/10 rule of thumb, keyed off the "where will this be printed" dropdown.
- **Real decode test** — after rendering, the QR is re-decoded client-side with `jsQR`, the same way a phone scanner would read it. This is the most important check: it catches issues the other three heuristics might miss.

All thresholds are adjustable constants at the top of `script.js` (`CONFIG` object).

## Known limitations / good next steps

- WiFi / phone / email payload formats are implemented with standard QR conventions but haven't been tested against every scanner app — worth a quick manual test pass.
- The minimum-print-size number is a heuristic, not a precise calculation from actual module count — fine for directional guidance, could be made exact later by reading `qrCode._qr` internals if needed.
- No analytics/event tracking wired in yet.
- Add the page to the sitemap and submit it in Google Search Console after launch.

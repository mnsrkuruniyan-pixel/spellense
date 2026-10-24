import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.70.119",
    "192.168.70.119:3000",
    "localhost",
    "localhost:3000",
    "*.local",
  ],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./dictionaries/**/*",
      "./eng.traineddata",
      "./node_modules/pdfjs-dist/**/*",
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
    ],
  },
  serverExternalPackages: [
    "tesseract.js",
    "tesseract.js-core",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "mammoth",
    "pptx2json",
    "xlsx",
    "nspell",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.spellense.com",
          },
        ],
        destination: "https://spellense.com/:path*",
        permanent: true,
      },
      {
        source: "/id",
        destination: "/print-sheet-maker",
        permanent: true,
      },
      {
        source: "/id-card",
        destination: "/print-sheet-maker",
        permanent: true,
      },
      {
        source: "/id-print-maker",
        destination: "/print-sheet-maker",
        permanent: true,
      },
      {
        source: "/id-card-maker",
        destination: "/print-sheet-maker",
        permanent: true,
      },
      {
        source: "/blog/how-to-spell-check-images-and-graphics-online",
        destination: "/blog/why-normal-spell-checkers-miss-typos-in-images",
        permanent: true,
      },
      {
        source: "/blog/top-5-mistakes-in-presentation-slides",
        destination: "/blog/how-to-check-spelling-in-canva-before-publishing",
        permanent: true,
      },
      {
        source: "/blog/american-vs-british-english-spelling-guide",
        destination: "/blog/how-to-find-spelling-mistakes-in-scanned-pdf",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

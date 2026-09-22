import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
            value: "camera=(), microphone=(), geolocation=()",
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
    ];
  },
};

export default nextConfig;

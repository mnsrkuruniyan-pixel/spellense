import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./dictionaries/**/*",
      "./eng.traineddata",
      "./node_modules/pdfjs-dist/**/*",
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
};

export default nextConfig;

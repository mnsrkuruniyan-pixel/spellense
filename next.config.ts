import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "tesseract.js",
    "tesseract.js-core",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "mammoth",
    "pptx2json",
    "xlsx",
    "nspell",
    "dictionary-en",
    "dictionary-en-gb",
  ],
};

export default nextConfig;

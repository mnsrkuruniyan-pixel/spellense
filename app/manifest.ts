import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spellense — Visual English Spell Checker",
    short_name: "Spellense",
    description:
      "Check English spelling in images, PDFs, DOCX, PPTX and XLSX files online. Private in-memory OCR spell checking.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}


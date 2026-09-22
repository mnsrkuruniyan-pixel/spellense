import type { Metadata } from "next";
import DesignCheckClient from "./DesignCheckClient";

export const metadata: Metadata = {
  title: "AI Design Check & Pre-Flight QA — Spellense",
  description:
    "Free AI Design Pre-Flight Quality Checker. Detect spelling, grammar, low WCAG contrast, and bleed margin cutoffs in posters, social ads, flyers, and banners before publishing or printing.",
  keywords: [
    "design checker",
    "poster quality check",
    "flyer spell check",
    "ad creative QA",
    "WCAG contrast checker image",
    "print preflight tool",
    "social media design checker",
    "design error finder",
  ],
  alternates: {
    canonical: "/design-check",
  },
  openGraph: {
    title: "AI Design Check & Pre-Flight QA — Spellense",
    description:
      "Automated visual pre-flight quality checker for graphic designs, ads, posters, and flyers. Catch typos, contrast issues, and margin cutoffs.",
    url: "https://spellense.com/design-check",
    siteName: "Spellense",
    type: "website",
  },
};

export default function DesignCheckPage() {
  return <DesignCheckClient />;
}


import type { Metadata } from "next";
import DesignCheckClient from "./DesignCheckClient";

export const metadata: Metadata = {
  title: "Catch the Mistake Before Your Client Does — AI Design Check",
  description:
    "Free AI Design Pre-Flight Quality Checker. Detect spelling, grammar, low WCAG contrast, and bleed margin cutoffs in posters, social ads, flyers, and banners before publishing or printing.",
  alternates: {
    canonical: "/design-check",
  },
  openGraph: {
    title: "Catch the Mistake Before Your Client Does | Spellense",
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


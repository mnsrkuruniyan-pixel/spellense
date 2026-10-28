import type { Metadata } from "next";
import PrintSheetMakerClient from "./PrintSheetMakerClient";

export const metadata: Metadata = {
  title: "ID Print Maker: Copy ID Card Front & Back on One Page (Free PDF)",
  description:
    "Copy your ID card front and back onto one page at exact physical dimensions (85.6 × 54 mm). 100% private in-browser ID print maker with auto-crop, custom layout, and security watermark.",
  keywords: [
    "id print maker",
    "copy id card front and back on one page",
    "print id card a4",
    "id card print sheet",
    "id card photocopy online",
    "identity card print on a4",
    "badge and license copy on one sheet",
    "cr80 print template",
    "driving license copy on one page",
    "free id photocopy online",
  ],
  alternates: {
    canonical: "/print-sheet-maker",
  },
  openGraph: {
    siteName: "Spellense",
    title: "ID Print Maker: Copy ID Card Front & Back on One Page",
    description:
      "Copy and print both sides of your ID card at exact 1:1 real-world physical scale (85.6 × 54 mm) on A4 or Letter paper. 100% private, runs entirely in your local browser.",
    url: "/print-sheet-maker",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense ID Print Maker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ID Print Maker: Copy ID Card Front & Back on One Page | Spellense",
    description:
      "Copy both sides of your ID card on one page with 100% exact real-world dimensions. Free, private in-browser tool.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://spellense.com/print-sheet-maker#app",
      name: "ID Print Maker",
      url: "https://spellense.com/print-sheet-maker",
      description:
        "Copy your ID card front and back onto a single A4 or Letter page with 100% exact real-world physical dimensions (85.6 × 54 mm). Automatic edge detection, perspective correction, anti-fraud security watermarks, and instant print-ready PDF export.",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      publisher: {
        "@type": "Organization",
        name: "Spellense",
        url: "https://spellense.com",
      },
      featureList: [
        "Front and back ID card copying",
        "Exact 1:1 real-world physical dimensions (85.6 × 54 mm)",
        "Automatic 4-corner perspective correction and cropping",
        "Stacked and Side-by-Side card layouts",
        "Anti-fraud security watermarks",
        "100% local in-browser processing with zero server uploads",
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Spellense",
          item: "https://spellense.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "ID Print Maker",
          item: "https://spellense.com/print-sheet-maker",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do I print the front and back of my ID card on one page?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Add both sides of your card using the upload button or camera on your phone. Spellense automatically detects the corners, straightens the perspective, and arranges both the front and back together on a single A4 or Letter page. You can choose a Stacked (top and bottom) or Side-by-Side layout, then click 'Download PDF' or 'Print'.",
          },
        },
        {
          "@type": "Question",
          name: "What is the exact physical size of a standard ID card?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Standard identity cards, driver's licenses, and residency badges follow the international ISO/IEC 7810 ID-1 (CR80) standard, measuring exactly 85.6 mm × 54 mm (3.370 × 2.125 inches). Spellense prints your card at 100% exact real-world dimensions by default, ensuring your printed photocopy matches the genuine card size.",
          },
        },
        {
          "@type": "Question",
          name: "Is it safe to copy my ID card or driver's license here?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, 100% safe. All image processing, perspective alignment, and PDF compilation take place entirely inside your web browser. No photos, personal identification numbers, or card data are ever transmitted to or stored on any server or cloud service. Furthermore, EXIF and GPS location metadata are stripped automatically, and your files vanish the moment you close the browser tab.",
          },
        },
        {
          "@type": "Question",
          name: "What printer settings should I use to get 100% exact size?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "In your computer or phone's print dialog (Adobe Acrobat, Preview, or Chrome), always select 'Actual Size' or set the scale to '100%'. Never choose 'Fit to Page' or 'Shrink Oversized Pages', as printer drivers automatically shrink the page margins, making your printed card smaller than standard physical dimensions.",
          },
        },
        {
          "@type": "Question",
          name: "What paper sizes are supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Spellense supports standard international A4 paper (210 × 297 mm) and US Letter paper (8.5 × 11 inches), as well as A3, A5, and custom paper sizes. You can print in either Portrait or Landscape orientation.",
          },
        },
        {
          "@type": "Question",
          name: "Can I copy and print multiple ID cards on the same page?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Click '+ Add another card' to add up to 5 different identity cards (or multiple family members' / employees' cards). Spellense automatically positions each card pair cleanly across the page or generates additional pages if required.",
          },
        },
        {
          "@type": "Question",
          name: "What is the security watermark feature and why should I use it?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The security watermark feature adds semi-transparent protective text (such as 'FOR VERIFICATION ONLY' or your custom note) across your card copies. This prevents identity theft and stops unauthorized parties from reusing your ID photocopy for unapproved registrations or loans.",
          },
        },
        {
          "@type": "Question",
          name: "How does the automatic corner crop and scanner work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "When you upload a photo of your card, our built-in scanner analyzes the image contrast to locate the card's 4 corners, corrects any angle distortion, and flattens it into a rectangular ID card. If your photo was taken on a busy surface, you can easily click 'Edit' to adjust the 4 corner pins manually with a high-magnification loupe.",
          },
        },
      ],
    },
  ],
};

export default function PrintSheetMakerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PrintSheetMakerClient />
    </>
  );
}

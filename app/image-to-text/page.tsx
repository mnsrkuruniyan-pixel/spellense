import type { Metadata } from "next";
import ImageToTextClient from "./ImageToTextClient";

export const metadata: Metadata = {
  title: "Free Image to Text Converter — Extract Text from Photos & Screenshots | Spellense",
  description:
    "Extract clean, copyable text from photos, screenshots, and scanned PDFs instantly with our free online OCR tool. No signup required, up to 25MB, 100% private.",
  alternates: { canonical: "/image-to-text" },
  openGraph: {
    title: "Free Image to Text Converter — Extract Text from Photos & Screenshots | Spellense",
    description:
      "Extract clean, copyable text from photos, screenshots, and documents instantly with free online OCR. No registration, up to 25MB, 100% private.",
    url: "/image-to-text",
  },
};

const faqItems = [
  {
    question: "What image formats and file types are supported?",
    answer:
      "Spellense supports raster images in JPG, JPEG, PNG, and WebP formats, as well as multi-page PDF documents. You can upload high-resolution screenshots, smartphone photos, scanned documents, and infographics with no registration required.",
  },
  {
    question: "What is the maximum file size limit?",
    answer:
      "The maximum file size limit is 25 MB per document. This generous allowance accommodates high-resolution camera photos, desktop screenshots, and large multi-page scanned PDF documents.",
  },
  {
    question: "Can Spellense extract text from scanned PDFs without an existing text layer?",
    answer:
      "Yes. Our OCR engine optically scans scanned PDF documents and flattened graphics to recognize and extract text tokens directly from raw pixel data, even if the PDF contains no embedded font or digital text layer.",
  },
  {
    question: "Are my uploaded files or extracted text stored on your servers?",
    answer:
      "No. Spellense operates on a strict zero-storage, in-memory architecture. Files are processed temporarily in volatile RAM exclusively to perform OCR extraction, and are immediately discarded. We never save files to disk, keep server logs of your content, or train AI models on user data.",
  },
  {
    question: "Is this image-to-text converter completely free to use?",
    answer:
      "Yes. Spellense Image to Text is 100% free with no sign-up, no hidden fees, no subscriptions, and no watermarks. You can convert as many images and documents as you need.",
  },
  {
    question: "Can I check the extracted text for typos and spelling mistakes?",
    answer:
      "Yes! Right after extracting your text, click 'Found a typo? Run spellcheck on this text →' to seamlessly carry the text directly into the Spellense proofreading engine without having to re-upload or retype anything.",
  },
];

export default function ImageToTextPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Spellense Free Image to Text Converter",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Free online OCR tool to extract copyable text from screenshots, photos, and scanned PDFs with zero server storage and instant spell check carry-over.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <ImageToTextClient />
    </>
  );
}

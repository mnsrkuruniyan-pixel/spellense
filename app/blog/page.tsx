import type { Metadata } from "next";
import BlogClient from "./BlogClient";
import { getAllPosts, getAllCategories } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog & Guides — OCR Proofreading & Design Quality",
  description:
    "Explore actionable guides on catching spelling mistakes in scanned PDFs, proofreading Canva graphics, mastering US vs UK English dialects, and pre-flight visual QA.",
  alternates: { canonical: "/blog" },
  openGraph: {
    siteName: "Spellense",
    title: "Spellense Blog & Knowledge Hub",
    description:
      "Actionable guides on finding hidden typos in images, scanned PDFs, Canva designs, and presentations.",
    url: "/blog",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spellense Blog & Knowledge Hub",
    description:
      "Actionable guides on finding hidden typos in images, scanned PDFs, Canva designs, and presentations.",
    images: ["/og-image.png"],
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const categories = getAllCategories();

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Spellense Blog",
    description:
      "In-depth guides on OCR proofreading, visual document spell checking, and pre-flight design quality assurance.",
    url: "https://spellense.com/blog",
    publisher: {
      "@type": "Organization",
      name: "Spellense",
      url: "https://spellense.com",
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      url: `https://spellense.com/blog/${post.slug}`,
      author: {
        "@type": "Organization",
        name: post.author.name,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <BlogClient posts={posts} categories={categories} />
    </>
  );
}


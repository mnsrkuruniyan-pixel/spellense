import type { Metadata } from "next";
import BlogClient from "./BlogClient";
import { getAllPosts, getAllCategories } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog & Guides — OCR Proofreading & Design Quality | Spellense",
  description:
    "Explore actionable guides on catching spelling mistakes in scanned PDFs, proofreading Canva graphics, mastering US vs UK English dialects, and pre-flight visual QA.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Spellense Blog & Knowledge Hub",
    description:
      "Actionable guides on finding hidden typos in images, scanned PDFs, Canva designs, and presentations.",
    url: "/blog",
    type: "website",
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

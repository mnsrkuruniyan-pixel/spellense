"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { BlogPost } from "@/lib/blog";

export default function BlogClient({ posts, categories }: { posts: BlogPost[]; categories: string[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "All") return posts;
    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  const featuredPost = posts[0];

  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="relative z-10 min-h-screen overflow-x-hidden bg-[#faf9f6] font-sans text-[15px] text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black">

      <Navbar />

      <main className="relative px-4 pb-16 pt-3 sm:px-6 sm:pt-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl pb-2 pt-2 text-center sm:pt-6">
            <div style={{ color: "#3158d5", letterSpacing: "0.18em", fontSize: "12px", fontWeight: 700 }} className="mb-3 inline-flex items-center uppercase sm:mb-4">
              The Spellense Journal
            </div>
            <h1 className="mx-auto flex flex-col items-center justify-center text-center tracking-tight text-[#1c201a]">
              <span className="block text-[34px] font-black leading-[1.12] tracking-[-0.035em] text-[#1c201a] sm:text-[56px] md:text-[64px] lg:text-[72px]">
                Words worth
              </span>
              <span
                style={{
                  fontFamily: "'ITC Modern No. 216', var(--font-itc-modern), 'Instrument Serif', Georgia, serif",
                  fontSize: "clamp(38px, 4.8vw, 64px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  display: "block",
                  marginTop: "6px",
                }}
                className="text-[#1c201a]"
              >
                getting right.
              </span>
            </h1>
            <p style={{ color: "#70746d", fontSize: "16px", lineHeight: 1.55, maxWidth: "none", margin: "18px auto 0" }} className="text-center font-normal sm:whitespace-nowrap">
              Practical guides for sharper copy, cleaner designs, and confident publishing.
            </p>

            {/* CATEGORY FILTER PILLS */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                style={selectedCategory === "All" ? { backgroundColor: "#3158d5", color: "#ffffff", borderColor: "#3158d5" } : { backgroundColor: "#ffffff", color: "#70746d", borderColor: "#e5e5df" }}
                className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-[#3158d5] hover:text-[#3158d5] ${
                  selectedCategory === "All"
                    ? "shadow-xs"
                    : ""
                }`}
              >
                All Articles ({posts.length})
              </button>
              {categories.map((cat) => {
                const count = posts.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={selectedCategory === cat ? { backgroundColor: "#3158d5", color: "#ffffff", borderColor: "#3158d5" } : { backgroundColor: "#ffffff", color: "#70746d", borderColor: "#e5e5df" }}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-[#3158d5] hover:text-[#3158d5] ${
                      selectedCategory === cat
                        ? "shadow-xs"
                        : ""
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* FEATURED POST (Shown when "All" is active) */}
          {selectedCategory === "All" && featuredPost && (
            <div className="mt-10 sm:mt-12">
              <div style={{ borderColor: "#e5e5df" }} className="relative overflow-hidden rounded-[24px] border bg-white p-5 shadow-xs transition hover:border-[#3158d5]/40 sm:p-8 lg:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <span style={{ backgroundColor: "#efeee7", borderColor: "#e5e5df", color: "#3158d5" }} className="rounded-full border px-3 py-1 text-[11px] font-bold">
                        {featuredPost.category}
                      </span>
                      <span className="text-xs font-medium text-[#92958f]">
                        {featuredPost.readingTime}
                      </span>
                    </div>

                    <Link href={`/blog/${featuredPost.slug}`} className="group block mt-4">
                      <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#1c201a] transition group-hover:text-[#3158d5] sm:text-4xl">
                        {featuredPost.title}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-[#70746d] sm:text-base">
                        {featuredPost.subtitle}
                      </p>
                    </Link>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: "#3158d5" }} className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs">
                          SP
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1c201a]">{featuredPost.author.name}</p>
                          <p className="text-[11px] text-[#92958f]">{featuredPost.publishedAt}</p>
                        </div>
                      </div>

                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3158d5] transition hover:underline"
                      >
                        <span>Read Full Guide</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>

                  {/* Decorative preview widget */}
                  <div className="lg:w-[380px] shrink-0">
                    <div style={{ borderColor: "#e5e5df", backgroundColor: "#f6f5f3" }} className="rounded-2xl border p-6 text-center">
                      <div style={{ backgroundColor: "#3158d5" }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white shadow-md shadow-[#3158d5]/20">
                        ✳
                      </div>
                      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#92958f]">
                        Topic Cluster
                      </p>
                      <h3 className="mt-1 text-base font-bold text-[#1c201a]">
                        {featuredPost.cluster}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                        Explore practical advice from our latest guide.
                      </p>
                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        style={{ borderColor: "#e5e5df" }}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border bg-white px-4 py-2 text-xs font-bold text-[#1c201a] shadow-2xs transition hover:border-[#3158d5] hover:text-[#3158d5]"
                      >
                        Read Article
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ARTICLES GRID */}
          <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <article
                key={post.slug}
                style={{ borderColor: "#e5e5df" }}
                className="group flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#3158d5]/50 hover:shadow-md sm:p-6"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                      {post.category}
                    </span>
                    <span className="text-[11px] font-medium text-[#92958f]">
                      {post.readingTime}
                    </span>
                  </div>

                  <Link href={`/blog/${post.slug}`} className="block mt-4">
                    <h3 className="text-xl font-bold leading-snug text-[#1c201a] transition group-hover:text-[#3158d5] sm:text-2xl">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#70746d]">
                      {post.description}
                    </p>
                  </Link>
                </div>

                <div style={{ borderColor: "#efeee7" }} className="mt-6 flex items-center justify-between border-t pt-4">
                  <div className="text-[11px] text-[#92958f]">
                    <span>{post.publishedAt}</span>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#3158d5] transition group-hover:translate-x-0.5"
                  >
                    <span>Read</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* CROSS PROMO BANNER */}
          <div style={{ borderColor: "#e5e5df", backgroundColor: "#efeee7" }} className="mt-12 flex flex-col items-center justify-between gap-6 rounded-[24px] border p-6 text-center shadow-2xs sm:mt-16 sm:p-9 md:flex-row md:text-left">
            <div>
              <div style={{ backgroundColor: "#ffffff", color: "#3158d5" }} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                Visual Proofreader
              </div>
              <h3 className="mt-2 text-xl font-extrabold text-[#1c201a] sm:text-2xl">
                Ready to find spelling mistakes in your files?
              </h3>
              <p className="mt-1 max-w-xl text-xs text-[#70746d] sm:text-sm">
                Upload your images, Canva graphics, scanned PDFs, DOCX, or spreadsheets. No registration required.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <Link
                href="/"
                style={{ backgroundColor: "#3158d5" }}
                className="rounded-xl px-6 py-3 text-xs font-bold text-white shadow-xs shadow-[#3158d5]/20 transition hover:opacity-90 active:scale-95"
              >
                Scan Document Free
              </Link>
              <Link
                href="/design-check"
                style={{ borderColor: "#e5e5df" }}
                className="rounded-xl border bg-white px-5 py-3 text-xs font-bold text-[#1c201a] shadow-2xs transition hover:border-[#3158d5] hover:text-[#3158d5] active:scale-95"
              >
                Design Pre-Flight QA
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <Footer currentPath="/blog" />
    </div>
  );
}


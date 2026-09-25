"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import type { BlogPost } from "@/lib/blog";

export default function BlogClient({ posts, categories }: { posts: BlogPost[]; categories: string[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "All") return posts;
    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  const featuredPost = posts[0];

  return (
    <div className="min-h-screen bg-[#f0f6fe] text-black font-sans selection:bg-blue-500/10 selection:text-blue-600 relative overflow-x-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80" />
      <div className="pointer-events-none absolute top-40 -left-28 h-[400px] w-[400px] rounded-full bg-blue-200/40 blur-[100px]" />
      <div className="pointer-events-none absolute top-36 -right-28 h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-[110px]" />

      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-6 pb-12 sm:pt-10 sm:pb-16">
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Top pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-1.5 shadow-xs shadow-blue-500/5 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-[11px] font-bold uppercase tracking-wider text-transparent">
                Spellense Knowledge Hub
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-[-1.5px] text-black sm:text-5xl lg:text-[54px] leading-[1.12]">
              Guides to Visual Proofreading,{" "}
              <br />
              <span className="text-black">
                OCR &amp; Design Quality.
              </span>
            </h1>

            <p className="mx-auto mt-3.5 max-w-2xl text-[14px] leading-relaxed text-slate-600 sm:text-base">
              Learn how to catch hidden typos in PDFs, scan Canva graphics before printing, master US vs. UK dialects, and eliminate costly reprint disasters.
            </p>

            {/* CATEGORY FILTER PILLS */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === "All"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white/80 border border-slate-200/80 text-slate-600 hover:bg-white hover:text-slate-900"
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
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                        : "bg-white/80 border border-slate-200/80 text-slate-600 hover:bg-white hover:text-slate-900"
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
            <div className="mt-12">
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-md transition hover:border-blue-300 sm:p-10 lg:p-12">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-full bg-blue-50 border border-blue-200/70 px-3 py-1 text-[11px] font-bold text-blue-700">
                        {featuredPost.category}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {featuredPost.readingTime}
                      </span>
                    </div>

                    <Link href={`/blog/${featuredPost.slug}`} className="group block mt-4">
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 transition group-hover:text-blue-600">
                        {featuredPost.title}
                      </h2>
                      <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600">
                        {featuredPost.subtitle}
                      </p>
                    </Link>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                          SP
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{featuredPost.author.name}</p>
                          <p className="text-[11px] text-slate-400">{featuredPost.publishedAt}</p>
                        </div>
                      </div>

                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 transition hover:text-blue-800"
                      >
                        <span>Read Full Guide</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>

                  {/* Decorative preview widget */}
                  <div className="lg:w-[380px] shrink-0">
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/40 p-6 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-md shadow-blue-500/25">
                        📄
                      </div>
                      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Topic Cluster
                      </p>
                      <h3 className="mt-1 text-base font-bold text-slate-900">
                        {featuredPost.cluster}
                      </h3>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                        Step-by-step technical breakdown of extracting OCR coordinates from non-selectable documents.
                      </p>
                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="mt-4 inline-flex items-center justify-center w-full rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
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
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-md shadow-slate-200/30 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                      {post.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {post.readingTime}
                    </span>
                  </div>

                  <Link href={`/blog/${post.slug}`} className="block mt-4">
                    <h3 className="text-lg font-bold text-slate-900 leading-snug transition group-hover:text-blue-600">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-3">
                      {post.description}
                    </p>
                  </Link>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    <span>{post.publishedAt}</span>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition group-hover:translate-x-0.5"
                  >
                    <span>Read</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* CROSS PROMO BANNER */}
          <div className="mt-16 rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-white p-8 sm:p-10 shadow-sm backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-100/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Visual Proofreader
              </div>
              <h3 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">
                Ready to find spelling mistakes in your files?
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl">
                Upload your images, Canva graphics, scanned PDFs, DOCX, or spreadsheets. No registration required.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <Link
                href="/"
                className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95"
              >
                Scan Document Free
              </Link>
              <Link
                href="/design-check"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
              >
                Design Pre-Flight QA
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
            <div>
              <div className="text-lg font-bold">
                Spel<span className="text-blue-600">lense</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Simple English spell checking &amp; design pre-flight QA for visual content.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-400">
              <Link href="/" className="transition hover:text-gray-700">Home</Link>
              <Link href="/blog" className="font-semibold text-blue-600">Blog</Link>
              <Link href="/design-check" className="transition hover:text-gray-700">Design Check</Link>
              <Link href="/case-converter" className="transition hover:text-gray-700">Case Converter</Link>
              <Link href="/us-uk-converter" className="transition hover:text-gray-700">US ↔ UK Dialect</Link>
              <Link href="/about" className="transition hover:text-gray-700">About</Link>
              <Link href="/faq" className="transition hover:text-gray-700">FAQ</Link>
              <Link href="/privacy" className="transition hover:text-gray-700">Privacy</Link>
              <Link href="/terms" className="transition hover:text-gray-700">Terms</Link>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-[11px] text-gray-300">
            &copy; 2026 Spellense. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}


import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found | Spellense Blog",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://spellense.com";
  const url = `${baseUrl}/blog/${post.slug}`;

  return {
    title: `${post.title} | Spellense Blog`,
    description: post.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/og-image.png"],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(post.slug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://spellense.com";
  const pageUrl = `${baseUrl}/blog/${post.slug}`;

  // Article JSON-LD Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    author: {
      "@type": "Organization",
      name: post.author.name,
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Spellense",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    keywords: post.tags.join(", "),
  };

  // BreadcrumbList JSON-LD Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${baseUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: pageUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] bg-dot-pattern text-slate-800 font-sans selection:bg-blue-500/10 selection:text-blue-600 relative overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80" />
      <div className="pointer-events-none absolute top-40 -left-28 h-[400px] w-[400px] rounded-full bg-blue-200/40 blur-[100px]" />
      <div className="pointer-events-none absolute top-36 -right-28 h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-[110px]" />

      <Navbar />

      <main className="relative mx-auto max-w-7xl px-5 pt-4 pb-20 sm:px-6 lg:px-8">
        {/* BREADCRUMBS */}
        <nav aria-label="Breadcrumbs" className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link href="/" className="transition hover:text-slate-700">Home</Link>
          <span>/</span>
          <Link href="/blog" className="transition hover:text-slate-700">Blog</Link>
          <span>/</span>
          <span className="truncate max-w-[280px] sm:max-w-md text-slate-600 font-semibold">{post.title}</span>
        </nav>

        {/* ARTICLE HEADER HERO */}
        <header className="mx-auto max-w-4xl text-center pb-8 border-b border-slate-200/80">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-1.5 shadow-2xs backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              {post.category}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-[-1.5px] text-slate-900 sm:text-4xl lg:text-[46px] leading-[1.18]">
            {post.title}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-[15px] sm:text-base leading-relaxed text-slate-600">
            {post.subtitle}
          </p>

          {/* META INFO */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 font-bold text-[10px] text-white">
                SP
              </div>
              <span className="font-semibold text-slate-800">{post.author.name}</span>
            </div>
            <span>•</span>
            <time dateTime={post.publishedAt}>{post.publishedAt}</time>
            <span>•</span>
            <span>{post.readingTime}</span>
          </div>
        </header>

        {/* CONTENT LAYOUT WITH STICKY TABLE OF CONTENTS */}
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-12">
          {/* SIDEBAR: TABLE OF CONTENTS (4 COLS ON DESKTOP) */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Table of Contents
              </p>
              <nav className="mt-3 space-y-2">
                {post.tableOfContents.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-xs leading-relaxed text-slate-600 transition hover:text-blue-600 hover:translate-x-1"
                  >
                    <span className="text-slate-400 font-mono mr-1.5">{index + 1}.</span>
                    <span>{item.title}</span>
                  </a>
                ))}
              </nav>

              {/* SIDEBAR TOOL PROMO */}
              <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center">
                <span className="text-2xl">⚡</span>
                <h4 className="mt-2 text-xs font-bold text-slate-900">
                  {post.ctaTool.title}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {post.ctaTool.description}
                </p>
                <Link
                  href={post.ctaTool.href}
                  className="mt-3 block w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                >
                  {post.ctaTool.buttonText}
                </Link>
              </div>
            </div>
          </aside>

          {/* MAIN ARTICLE BODY (8 COLS) */}
          <article className="lg:col-span-8">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-lg shadow-slate-200/30">
              {/* MOBILE TABLE OF CONTENTS */}
              <div className="mb-8 block rounded-2xl border border-slate-200 bg-slate-50/70 p-5 lg:hidden">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  In This Guide
                </p>
                <div className="mt-2.5 space-y-2">
                  {post.tableOfContents.map((item, index) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block text-xs text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-mono text-slate-400 mr-1">{index + 1}.</span>
                      {item.title}
                    </a>
                  ))}
                </div>
              </div>

              {/* RENDERED ARTICLE HTML */}
              <div
                className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-slate-700
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
                prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl
                prose-p:my-4 prose-p:leading-relaxed
                prose-a:text-blue-600 prose-a:font-semibold prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-800
                prose-code:text-blue-700 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                prose-li:my-1.5"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* IN-ARTICLE CTA BOX */}
              <div className="mt-12 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-xl shadow-blue-500/20">
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Try It in Action
                </span>
                <h3 className="mt-3 text-xl sm:text-2xl font-extrabold text-white">
                  {post.ctaTool.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
                  {post.ctaTool.description}
                </p>
                <div className="mt-5">
                  <Link
                    href={post.ctaTool.href}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-xs font-bold text-blue-700 shadow-md transition hover:bg-blue-50 hover:scale-105 active:scale-95"
                  >
                    <span>{post.ctaTool.buttonText}</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>

              {/* TAGS */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                    Related Tags:
                  </span>
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* RELATED ARTICLES SECTION */}
        {relatedPosts.length > 0 && (
          <section className="mx-auto mt-20 max-w-6xl border-t border-slate-200/80 pt-12">
            <div className="text-center sm:text-left mb-8">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Continue Reading
              </p>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
                Related Proofreading &amp; Design Guides
              </h3>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <div
                  key={related.slug}
                  className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                    {related.category}
                  </span>
                  <Link href={`/blog/${related.slug}`} className="block mt-3">
                    <h4 className="text-base font-bold text-slate-900 hover:text-blue-600">
                      {related.title}
                    </h4>
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                      {related.description}
                    </p>
                  </Link>
                  <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                    <span className="text-slate-400">{related.readingTime}</span>
                    <Link
                      href={`/blog/${related.slug}`}
                      className="font-bold text-blue-600 hover:text-blue-800"
                    >
                      Read Guide &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
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

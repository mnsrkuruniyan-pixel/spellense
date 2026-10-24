import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
      title: "Article Not Found",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://spellense.com";
  const url = `${baseUrl}/blog/${post.slug}`;

  return {
    title: post.metaTitle ? { absolute: post.metaTitle } : post.title,
    description: post.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      siteName: "Spellense",
      title: post.metaTitle || post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: post.image || "/og-image.png",
          width: 1200,
          height: post.image ? 675 : 630,
          alt: post.imageAlt || post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.description,
      images: [post.image || "/og-image.png"],
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

  // Article / BlogPosting JSON-LD Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.image ? `${baseUrl}${post.image}` : `${baseUrl}/og-image.png`,
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
        url: `${baseUrl}/icon-192.png`,
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

  // FAQPage JSON-LD Schema
  const faqSchema =
    post.faqs && post.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="relative z-10 min-h-screen overflow-x-hidden bg-[#faf9f6] font-sans text-[15px] text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <Navbar />

      <main className="relative mx-auto max-w-7xl px-4 pb-20 pt-3 sm:px-6 sm:pt-6 lg:px-8">
        {/* BREADCRUMBS */}
        <nav aria-label="Breadcrumbs" className="mb-6 flex items-center gap-2 text-xs font-medium text-[#92958f]">
          <Link href="/" className="text-[#70746d] transition hover:text-[#3158d5] hover:underline">Home</Link>
          <span>/</span>
          <Link href="/blog" className="text-[#70746d] transition hover:text-[#3158d5] hover:underline">Blog</Link>
          <span>/</span>
          <span className="truncate max-w-[280px] sm:max-w-md text-slate-600 font-semibold">{post.title}</span>
        </nav>

        {/* ARTICLE HEADER HERO */}
        <header style={{ borderBottom: "1px solid #e5e5df" }} className="mx-auto max-w-4xl pb-8 text-center">
          <div style={{ borderColor: "#e5e5df", backgroundColor: "#efeee7", color: "#3158d5" }} className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5">
            <span className="flex h-2 w-2 rounded-full bg-[#3158d5]" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {post.category}
            </span>
          </div>

          <h1
            style={{ fontSize: "clamp(28px, 2.35vw, 36px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.04em" }}
            className="mt-5 text-[#1c201a]"
          >
            {post.title}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[#70746d] sm:text-base">
            {post.subtitle}
          </p>

          {/* META INFO */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#92958f]">
            <div className="flex items-center gap-2">
              <div style={{ backgroundColor: "#3158d5" }} className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-[10px] text-white">
                SP
              </div>
              <span className="font-semibold text-[#1c201a]">{post.author.name}</span>
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
            <div style={{ borderColor: "#e5e5df" }} className="sticky top-24 rounded-2xl border bg-white p-6 shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#92958f]">
                Table of Contents
              </p>
              <nav className="mt-3 space-y-2">
                {post.tableOfContents.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-xs leading-relaxed text-[#70746d] transition hover:translate-x-1 hover:text-[#3158d5]"
                  >
                    <span className="text-slate-400 font-mono mr-1.5">{index + 1}.</span>
                    <span>{item.title}</span>
                  </a>
                ))}
              </nav>

              {/* SIDEBAR TOOL PROMO */}
              <div style={{ borderColor: "#e5e5df", backgroundColor: "#f6f5f3" }} className="mt-8 rounded-2xl border p-4 text-center">
                <span className="text-2xl">⚡</span>
                <h4 className="mt-2 text-xs font-bold text-[#1c201a]">
                  {post.ctaTool.title}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-[#70746d]">
                  {post.ctaTool.description}
                </p>
                <Link
                  href={post.ctaTool.href}
                  style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                  className="mt-3 block w-full rounded-xl px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3158d5]"
                >
                  {post.ctaTool.buttonText}
                </Link>
              </div>
            </div>
          </aside>

          {/* MAIN ARTICLE BODY (8 COLS) */}
          <article className="lg:col-span-8">
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-5 shadow-2xs sm:rounded-[24px] sm:p-10">
              {/* MOBILE TABLE OF CONTENTS */}
              <div style={{ borderColor: "#e5e5df", backgroundColor: "#f6f5f3" }} className="mb-8 block rounded-2xl border p-5 lg:hidden">
                <p className="text-xs font-bold uppercase tracking-wider text-[#92958f]">
                  In This Guide
                </p>
                <div className="mt-2.5 space-y-2">
                  {post.tableOfContents.map((item, index) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block text-xs text-[#70746d] transition hover:text-[#3158d5]"
                    >
                      <span className="font-mono text-slate-400 mr-1">{index + 1}.</span>
                      {item.title}
                    </a>
                  ))}
                </div>
              </div>

              {/* RENDERED ARTICLE HTML */}
              <div
                className="prose prose-slate max-w-none text-sm leading-relaxed text-[#70746d] sm:text-base
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-[#1c201a]
                prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl
                prose-p:my-4 prose-p:leading-relaxed
                prose-a:text-[#3158d5] prose-a:font-semibold prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-[#1c201a]
                prose-code:text-[#3158d5] prose-code:bg-[#f6f5f3] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                prose-li:my-1.5"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* FAQ SECTION */}
              {post.faqs && post.faqs.length > 0 && (
                <section id="faq" style={{ border: "1px solid #e5e5df" }} className="mt-12 rounded-2xl bg-[#faf9f6] p-6 shadow-2xs sm:p-8">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[#3158d5]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#3158d5]">
                      Got Questions?
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-[#1c201a] sm:text-2xl">
                    Frequently Asked Questions
                  </h3>
                  <div className="mt-6 divide-y divide-slate-100">
                    {post.faqs.map((faq, idx) => (
                      <div key={idx} className="py-4.5 first:pt-2 last:pb-2">
                        <h4 className="text-base font-bold text-[#1c201a]">
                          {faq.question}
                        </h4>
                        <p className="mt-2 text-sm leading-relaxed text-[#70746d]">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* IN-ARTICLE CTA BOX */}
              <div style={{ borderColor: "#e5e5df", backgroundColor: "#efeee7" }} className="mt-12 rounded-2xl border p-6 shadow-2xs sm:p-8">
                <span style={{ backgroundColor: "#ffffff", color: "#3158d5" }} className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                  Try It in Action
                </span>
                <h3 className="mt-3 text-xl font-extrabold text-[#1c201a] sm:text-2xl">
                  {post.ctaTool.title}
                </h3>
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#70746d] sm:text-sm">
                  {post.ctaTool.description}
                </p>
                <div className="mt-5">
                  <Link
                    href={post.ctaTool.href}
                    style={{ color: "#3158d5" }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-bold shadow-md transition hover:scale-105 hover:bg-[#f6f5f3] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span>{post.ctaTool.buttonText}</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>

              {/* TAGS */}
              <div style={{ borderColor: "#e5e5df" }} className="mt-8 border-t pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs font-bold uppercase tracking-wider text-[#92958f]">
                    Related Tags:
                  </span>
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{ backgroundColor: "#f6f5f3", color: "#70746d" }}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium"
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
          <section style={{ borderColor: "#e5e5df" }} className="mx-auto mt-16 max-w-6xl border-t pt-12">
            <div className="text-center sm:text-left mb-8">
              <p className="text-xs font-bold uppercase tracking-wider text-[#3158d5]">
                Continue Reading
              </p>
              <h3 className="mt-1 text-2xl font-extrabold text-[#1c201a]">
                Related Proofreading &amp; Design Guides
              </h3>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <div
                  key={related.slug}
                  style={{ borderColor: "#e5e5df" }}
                  className="group rounded-2xl border bg-white p-5 shadow-2xs transition hover:border-[#3158d5]/40 hover:shadow-md sm:p-6"
                >
                  <span style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase">
                    {related.category}
                  </span>
                  <Link href={`/blog/${related.slug}`} className="block mt-3">
                    <h4 className="text-lg font-bold leading-snug text-[#1c201a] transition group-hover:text-[#3158d5] sm:text-xl">
                      {related.title}
                    </h4>
                    <p className="mt-2 line-clamp-2 text-xs text-[#70746d]">
                      {related.description}
                    </p>
                  </Link>
                  <div style={{ borderColor: "#efeee7" }} className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                    <span className="text-[#92958f]">{related.readingTime}</span>
                    <Link
                      href={`/blog/${related.slug}`}
                      className="font-bold text-[#3158d5] transition hover:text-[#1c201a] hover:underline"
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
      <Footer currentPath="/blog" />
    </div>
  );
}



import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "3D Flipbook", href: "/flipbook", badge: "New" },
  { label: "Image Compressor", href: "/image-compressor" },
  { label: "ID Print Maker", href: "/print-sheet-maker", badge: "New" },
  { label: "QR Code Generator", href: "/qr-code-generator", badge: "New" },
  { label: "Image to Text", href: "/image-to-text" },
  { label: "Design Check", href: "/design-check", badge: "New" },
  { label: "Case Converter", href: "/case-converter" },
  { label: "US ↔ UK Dialect", href: "/us-uk-converter" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export default function Footer({
  currentPath,
}: {
  currentPath?: string;
}) {
  return (
    <footer className="border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <div className="text-lg font-bold text-slate-900">
              Spellense
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Free English spell checker &amp; visual proofreader for images,
              documents, and creative work.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3.5 text-xs text-slate-500 sm:gap-5">
            {FOOTER_LINKS.map((link) => {
              const isCurrent = currentPath === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1 transition ${
                    isCurrent
                      ? "font-bold text-blue-600"
                      : "hover:text-slate-900"
                  }`}
                >
                  <span>{link.label}</span>

                  {link.badge && (
                    <span className="rounded bg-blue-50 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider text-blue-600">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <Link
              href="/contact"
              className="transition hover:text-slate-900"
            >
              Contact
            </Link>
          </div>
        </div>

        {/* Twelve Tools badge */}
        <div className="mt-4 flex justify-center">
          <a
            href="https://twelve.tools"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Featured on Twelve Tools"
            className="inline-flex items-center justify-center transition-opacity duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
          >
            <img
              src="https://twelve.tools/badge0-white.svg"
              alt="Featured on Twelve Tools"
              width={148}
              height={40}
              className="h-10 w-[148px] object-contain"
            />
          </a>
        </div>

        {/* Copyright */}
        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} Spellense. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

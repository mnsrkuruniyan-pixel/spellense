import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "3D Flipbook", href: "/flipbook", badge: "New" },
  { label: "Image Compressor", href: "/image-compressor" },
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

export default function Footer({ currentPath }: { currentPath?: string }) {
  return (
    <footer className="border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <div className="text-lg font-bold text-slate-900">
              Spel<span className="text-blue-600">lense</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Free English spell checker &amp; visual proofreader for images, documents, and creative work.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3.5 sm:gap-5 text-xs text-slate-500">
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
            <a
              href="mailto:hello@spellense.com"
              className="transition hover:text-slate-900"
            >
              Contact
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} Spellense. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      {/* BACKGROUND DOT PATTERN & AMBIENT MESH GLOW */}
      <div className="bg-dot-pattern pointer-events-none fixed inset-0 opacity-60" />
      <div className="animate-pulse-glow pointer-events-none fixed top-[-10%] left-[20%] h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 blur-[120px]" />
      <div className="animate-pulse-glow pointer-events-none fixed bottom-[10%] right-[15%] h-[450px] w-[450px] rounded-full bg-gradient-to-br from-violet-400/15 to-blue-400/15 blur-[120px]" />

      {/* STICKY NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-black text-white shadow-md shadow-blue-500/25">
              S
            </span>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                Spellense
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Visual Spell Checker
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Home
            </Link>
            <Link
              href="/faq"
              className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              FAQ
            </Link>
            <Link
              href="/privacy"
              className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      {/* 404 MAIN HERO */}
      <main className="relative z-10 flex min-h-[calc(100vh-160px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 shadow-inner ring-1 ring-blue-100">
            <span className="text-2xl font-black">404</span>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-600">
            <span>⚠️</span>
            <span>Page Not Found</span>
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
            Lost in the document?
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            The page you are looking for doesn&apos;t exist or might have been moved. Let&apos;s get you back to inspecting your files and documents.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition hover:shadow-xl hover:shadow-blue-600/35 active:scale-98"
            >
              <span>Back to Spell Checker</span>
              <span>→</span>
            </Link>

            <Link
              href="/faq"
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              <span>Explore Help & FAQ</span>
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/70 py-6 text-center text-xs text-slate-400 backdrop-blur-md">
        <p>© {new Date().getFullYear()} Spellense. Free & private in-memory spell checking.</p>
      </footer>
    </div>
  );
}


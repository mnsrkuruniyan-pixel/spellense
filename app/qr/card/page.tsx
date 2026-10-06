import type { Metadata } from "next";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const title = (typeof params.title === "string" ? params.title : "") || "My QR Code";
  const desc = (typeof params.desc === "string" ? params.desc : "") || "Scan this QR code to view contents.";
  const data = (typeof params.data === "string" ? params.data : "") || "https://spellense.com";

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(data)}`;

  return {
    title: `${title} | QR Code`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      images: [
        {
          url: qrImageUrl,
          width: 600,
          height: 600,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [qrImageUrl],
    },
  };
}

export default async function QrCardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const title = (typeof params.title === "string" ? params.title : "") || "My QR Code";
  const desc = (typeof params.desc === "string" ? params.desc : "") || "Scan this QR code to view contents or connect.";
  const data = (typeof params.data === "string" ? params.data : "") || "https://spellense.com";

  const isUrl = data.startsWith("http://") || data.startsWith("https://");
  const isPhone = data.startsWith("tel:");
  const isEmail = data.startsWith("mailto:");
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(data)}`;

  return (
    <div className="min-h-screen bg-[#f0f6fe] flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white font-sans">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black mb-3">
          Verified QR Code
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">{title}</h1>
        {desc && <p className="text-xs sm:text-sm font-medium text-slate-500 mb-5">{desc}</p>}

        <div className="w-56 h-56 sm:w-64 sm:h-64 mx-auto bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-center mb-6">
          <img src={qrImageUrl} alt={title} className="w-full h-full object-contain" />
        </div>

        {isUrl && (
          <a
            href={data}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition-colors block text-center mb-3 shadow-sm truncate"
          >
            Visit: {data}
          </a>
        )}

        {isPhone && (
          <a
            href={data}
            className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition-colors block text-center mb-3 shadow-sm"
          >
            Call: {data.replace("tel:", "")}
          </a>
        )}

        {isEmail && (
          <a
            href={data}
            className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition-colors block text-center mb-3 shadow-sm"
          >
            Email: {data.replace("mailto:", "")}
          </a>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Created on Spellense</span>
          <Link href="/qr-code-generator" className="text-emerald-600 hover:underline font-bold">
            Create your own QR
          </Link>
        </div>
      </div>
    </div>
  );
}

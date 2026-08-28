import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import Footer from "@/components/Footer";
import ShellChrome from "@/components/ShellChrome";
import Web3Provider from "@/components/Web3Provider";
import { getDict, isLocale, LOCALES } from "@/lib/i18n";

const body = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://indonesia-web3-hackathon.vercel.app";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const t = getDict(params.locale).meta;
  return {
    metadataBase: new URL(SITE_URL),
    // Judul sub-halaman ("Prizes") otomatis jadi "Prizes | Indonesia Web3 Hackathon 2026".
    // Separator pipe, bukan dash. Home pakai `default`.
    title: {
      default: t.title,
      template: "%s | Indonesia Web3 Hackathon 2026",
    },
    description: t.description,
    openGraph: {
      title: "Indonesia Web3 Hackathon 2026",
      description: t.ogDescription,
      type: "website",
      siteName: "Indonesia Web3 Hackathon 2026",
    },
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    icons: {
      icon: [
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
  };
}

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  const { children } = props;

  if (!isLocale(params.locale)) notFound();
  const dict = getDict(params.locale);

  return (
    <html lang={params.locale} className={body.variable}>
      <head>
        {/* Preload font display self-hosted — dipakai di judul above-the-fold. */}
        <link
          rel="preload"
          href="/media/fonts/tt-firs-neue.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-body antialiased">
        <Web3Provider>
          {/* Kartu inset: seluruh situs hidup di dalam container membulat ini */}
          <div className="h-[100dvh] bg-white/[0.04] p-3 sm:p-5">
            <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-white/[0.04] sm:rounded-[36px]">
              <div
                id="scroll-root"
                className="no-scrollbar absolute inset-0 overflow-y-auto overflow-x-hidden"
              >
                {children}
                <Footer locale={params.locale} dict={dict} />
              </div>
              <ShellChrome nav={dict.nav} brand={dict.brand} submitCta={dict.home.cta} />
            </div>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}

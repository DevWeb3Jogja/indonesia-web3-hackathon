import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ProjectSubmit from "@/components/ProjectSubmit";
import { getDict, localePath } from "@/lib/i18n";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return { title: getDict(params.locale).submit.metaTitle, robots: { index: false } };
}

/** Halaman submission fokus — full-page tanpa nav/footer (disembunyikan oleh HideChrome).
 *  Hanya brand kecil + tombol tutup sebagai jalan keluar ke /my. */
export default async function SubmitPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dict = getDict(locale);
  const t = dict.submit;

  return (
    <div className="min-h-[100dvh] bg-black">
      <div className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href={localePath(locale, "/")} aria-label="Home">
          <Image src="/logo.png" alt="" width={28} height={28} className="object-contain" />
        </Link>
        <Link
          href={localePath(locale, "/my")}
          aria-label={dict.nav.closeMenu}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-24 pt-6 sm:px-10 sm:pt-10">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="page-title mt-3">
          {t.title1} {t.title2}
        </h1>
        <div className="mt-10">
          <ProjectSubmit locale={locale} t={dict.psubmit} form={dict.form} />
        </div>
      </div>
    </div>
  );
}

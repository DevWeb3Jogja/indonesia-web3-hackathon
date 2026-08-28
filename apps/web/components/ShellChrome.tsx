"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { LOCALES, localePath, splitPath } from "@/lib/locale";
import AuthNavLink from "./AuthNavLink";
import ConnectWalletButton from "./ConnectWalletButton";
import JudgeNavLink from "./JudgeNavLink";
import { ArrowUpRight, BrandMark } from "./ui";

/** Urutan nav; label diambil dari kamus. */
const NAV = [
  { path: "/", key: "home" },
  { path: "/projects", key: "projects" },
  { path: "/prizes", key: "prizes" },
  { path: "/schedule", key: "schedule" },
  { path: "/faq", key: "faq" },
] as const;

/** Index halaman aktif untuk indikator "01 — 05". null = di luar nav utama. */
function navIndex(path: string): number | null {
  const i = NAV.findIndex((n) => n.path === path || (n.path !== "/" && path.startsWith(n.path)));
  return i === -1 ? null : i + 1;
}

/** Ingat pilihan bahasa supaya kunjungan berikutnya ke "/" langsung benar. */
function rememberLocale(locale: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: cookie preferensi bahasa sederhana, Cookie Store API belum merata
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
}

function LocaleSwitch({
  locale,
  path,
  label,
  className = "",
}: {
  locale: string;
  path: string;
  label: string;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: grup link bahasa, fieldset hanya untuk form
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label={label}>
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={localePath(l, path)}
            onClick={() => rememberLocale(l)}
            hrefLang={l}
            aria-current={active ? "true" : undefined}
            className={`chamfer-sm px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition ${
              active ? "bg-teal text-white" : "text-neutral-500 hover:bg-haze hover:text-teal"
            }`}
          >
            {l}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Prop-nya sengaja sempit, bukan seluruh Dict: apa pun yang dioper ke client
 * component ikut diserialisasi ke payload SETIAP halaman.
 */
export default function ShellChrome({
  nav: t,
  brand,
  submitCta,
}: {
  nav: Dict["nav"];
  brand: Dict["brand"];
  submitCta: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { locale, path } = splitPath(pathname);
  const pos = navIndex(path);
  const isHome = path === "/";

  // Scroll hidup di dalam container, bukan di window — reset manual tiap pindah route,
  // sekaligus tutup menu mobile. Sengaja bergantung pathname walau tak dipakai di body.
  // biome-ignore lint/correctness/useExhaustiveDependencies: efek dijalankan saat route berubah
  useEffect(() => {
    document.getElementById("scroll-root")?.scrollTo({ top: 0 });
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ---------- Nav pill (desktop) ---------- */}
      <nav className="absolute left-1/2 top-0 z-40 hidden -translate-x-1/2 md:flex">
        <div className="relative flex items-center gap-6 rounded-b-[28px] bg-white px-6 py-4 lg:gap-10 lg:px-10">
          {/* sudut terbalik kiri & kanan, bikin pill-nya seolah terpahat dari tepi atas */}
          <span
            aria-hidden
            className="absolute -left-6 top-0 h-6 w-6 bg-white"
            style={{
              maskImage: "radial-gradient(circle at 0 100%, transparent 24px, black 25px)",
              WebkitMaskImage: "radial-gradient(circle at 0 100%, transparent 24px, black 25px)",
            }}
          />
          <span
            aria-hidden
            className="absolute -right-6 top-0 h-6 w-6 bg-white"
            style={{
              maskImage: "radial-gradient(circle at 100% 100%, transparent 24px, black 25px)",
              WebkitMaskImage: "radial-gradient(circle at 100% 100%, transparent 24px, black 25px)",
            }}
          />
          {NAV.map((item) => {
            const active = item.path === path || (item.path !== "/" && path.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={localePath(locale, item.path)}
                className={`text-[11px] font-medium uppercase tracking-[0.14em] transition ${
                  active ? "text-teal" : "text-neutral-800 hover:text-neutral-500"
                }`}
              >
                {t[item.key]}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ---------- Connect wallet + switcher bahasa, pojok kanan atas (desktop) ---------- */}
      <div className="absolute right-0 top-0 z-40 hidden items-center gap-3 rounded-bl-[24px] bg-white py-3 pl-4 pr-4 md:flex">
        <JudgeNavLink
          locale={locale}
          label={t.judge}
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-teal transition hover:brightness-125"
        />
        <AuthNavLink
          locale={locale}
          href="/team"
          label={t.team}
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-800 transition hover:text-teal"
        />
        <AuthNavLink
          locale={locale}
          href="/profile"
          label={t.profile}
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-800 transition hover:text-teal"
        />
        <ConnectWalletButton className="chamfer-sm bg-teal px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition hover:brightness-125" />
        <LocaleSwitch locale={locale} path={path} label={t.switchLanguage} />
      </div>

      {/* ---------- Bar atas (mobile) ---------- */}
      <div className="absolute inset-x-0 top-0 z-40 flex items-start justify-between md:hidden">
        <Link
          href={localePath(locale)}
          className="flex items-center gap-2 rounded-br-[24px] bg-white py-3 pl-4 pr-5 text-ink"
        >
          <BrandMark className="h-6 w-6" />
          <span className="leading-none">
            <span className="block text-[13px] font-semibold tracking-tight">{brand.line1}</span>
            <span className="-mt-0.5 block text-[10px] font-light opacity-80">{brand.line2}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t.closeMenu : t.openMenu}
          aria-expanded={open}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-bl-[24px] bg-white text-ink"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            aria-hidden
          >
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
        </button>
      </div>

      {/* ---------- Panel menu (mobile) ---------- */}
      {open && (
        <div className="absolute inset-0 z-30 flex flex-col justify-center bg-haze px-8 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item, i) => (
              <Link
                key={item.path}
                href={localePath(locale, item.path)}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-4 border-b border-teal/15 py-4"
              >
                <span className="text-[11px] font-medium tracking-[0.18em] text-teal/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-firs text-[30px] font-semibold uppercase tracking-tight text-ink">
                  {t[item.key]}
                </span>
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            <ConnectWalletButton className="btn-ink w-full" />
            <AuthNavLink
              locale={locale}
              href="/team"
              label={t.team}
              className="btn-outline w-full"
            />
            <AuthNavLink
              locale={locale}
              href="/profile"
              label={t.profile}
              className="btn-outline w-full"
            />
          </div>
          <div className="mt-10 flex items-center justify-between gap-4">
            <Link
              href={localePath(locale, "/submit")}
              onClick={() => setOpen(false)}
              className="btn-teal"
            >
              {submitCta}
              <ArrowUpRight />
            </Link>
            <LocaleSwitch locale={locale} path={path} label={t.switchLanguage} />
          </div>
        </div>
      )}

      {/* ---------- Indikator halaman ---------- */}
      {pos !== null && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-40 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-white/80 mix-blend-difference sm:bottom-6 sm:right-8">
          <span>{String(pos).padStart(2, "0")}</span>
          <span className="h-px w-8 bg-white/40" />
          <span>{String(NAV.length).padStart(2, "0")}</span>
        </div>
      )}

      {/* ---------- Petunjuk scroll (landing saja) ---------- */}
      {isHome && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-40 text-[10px] font-medium uppercase tracking-[0.18em] text-white/80 mix-blend-difference sm:bottom-6 sm:left-8">
          {t.scrollHint}
        </div>
      )}
    </>
  );
}

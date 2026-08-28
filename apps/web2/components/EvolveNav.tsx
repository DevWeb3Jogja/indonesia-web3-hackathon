"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { LOCALES, localePath, splitPath } from "@/lib/locale";
import ConnectWalletButton from "./ConnectWalletButton";

const NAV = [
  { path: "/", key: "home" },
  { path: "/projects", key: "projects" },
  { path: "/prizes", key: "prizes" },
  { path: "/schedule", key: "schedule" },
  { path: "/faq", key: "faq" },
] as const;

function remember(locale: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: preferensi bahasa sederhana
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
}

/** Nav evolve (pill) — dipakai SEMUA halaman web2. Sign-in = connect wallet,
 *  plus language switcher, sesuai permintaan. */
export default function EvolveNav({ nav, logo }: { nav: Dict["nav"]; logo: string }) {
  const pathname = usePathname();
  const { locale, path } = splitPath(pathname);
  const [open, setOpen] = useState(false);

  const to = (x: string) => localePath(locale, x);
  const active = (x: string) => x === path || (x !== "/" && path.startsWith(x));

  useEffect(() => {
    setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const langLinks = (extra: string) =>
    LOCALES.map((l) => (
      <Link
        key={l}
        href={localePath(l, path)}
        onClick={() => remember(l)}
        hrefLang={l}
        aria-current={l === locale ? "true" : undefined}
        className={`${extra} ${l === locale ? "active" : ""}`}
      >
        {l}
      </Link>
    ));

  return (
    <header className="ev-navbar">
      <div className="ev-navbar-inner">
        <Link className="ev-logo" href={to("/")} aria-label="Home">
          <img src={logo} alt="" width={46} height={46} />
        </Link>

        <nav className="ev-nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.path} href={to(n.path)} className={active(n.path) ? "active" : ""}>
              {nav[n.key]}
            </Link>
          ))}
        </nav>

        <div className="ev-right">
          {/* biome-ignore lint/a11y/useSemanticElements: grup pill bahasa, bukan fieldset form */}
          <div className="ev-lang" role="group" aria-label={nav.switchLanguage}>
            {langLinks("")}
          </div>
          <ConnectWalletButton className="ev-signin" />
        </div>

        <button
          type="button"
          className="ev-burger"
          aria-label={nav.openMenu}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay tutup menu */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Esc ditangani global */}
          <div className="ev-overlay" onClick={() => setOpen(false)} />
          <div className="ev-menu">
            <nav aria-label="Mobile">
              {NAV.map((n) => (
                <Link key={n.path} href={to(n.path)} className={active(n.path) ? "active" : ""}>
                  {nav[n.key]}
                </Link>
              ))}
              <div className="ev-mlang">{langLinks("")}</div>
              <ConnectWalletButton className="ev-msignin ev-signin" />
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

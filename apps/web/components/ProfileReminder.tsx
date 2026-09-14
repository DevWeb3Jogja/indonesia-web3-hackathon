"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { localePath, splitPath } from "@/lib/locale";

type T = { title: string; desc: string; cta: string; later: string };

const KEY = "iw3h:profile-reminder-dismissed";

/**
 * Pengingat global: kalau user sign-in tapi profilnya belum lengkap (isProfileComplete
 * false), tampilkan dialog untuk melengkapi — karena tanpa itu tak bisa submit/edit.
 * Sekali dismiss = diam untuk sesi ini (sessionStorage). Tidak muncul di /profile.
 */
export default function ProfileReminder({ t }: { t: T }) {
  const pathname = usePathname();
  const { locale } = splitPath(pathname);
  const onProfile = pathname.includes("/profile");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (onProfile) {
      setShow(false);
      return;
    }
    try {
      if (sessionStorage.getItem(KEY) === "1") return;
    } catch {
      /* sessionStorage tak tersedia */
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return; // belum sign-in → tak ada yang perlu diingatkan
        const u = (await res.json()) as { profileComplete?: boolean } | null;
        if (!cancelled) setShow(u?.profileComplete === false);
      } catch {
        /* offline / gagal → jangan ganggu */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, onProfile]);

  // Escape = tutup (a11y modal).
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* abaikan */
      }
      setShow(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  if (!show) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* abaikan */
    }
    setShow(false);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-reminder-title"
    >
      <div className="chamfer-lg w-full max-w-md border border-teal/25 bg-haze p-6 shadow-2xl">
        <h2 id="profile-reminder-title" className="section-title">
          {t.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">{t.desc}</p>
        <div className="mt-6 flex items-center gap-4">
          <Link
            href={`${localePath(locale, "/profile")}?next=${encodeURIComponent(pathname)}`}
            className="btn-teal"
            onClick={dismiss}
          >
            {t.cta}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-ink/60 transition hover:text-ink"
          >
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
}

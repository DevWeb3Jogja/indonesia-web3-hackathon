"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "@/components/ui";
import { getDict } from "@/lib/i18n";
import { splitPath } from "@/lib/locale";

/**
 * not-found.tsx tidak menerima params, jadi locale-nya diambil dari pathname.
 * ponytail: client component sebaris, tanpa provider context.
 */
export default function NotFound() {
  const { locale } = splitPath(usePathname() ?? "/");
  const t = getDict(locale).notFound;

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-haze px-6 py-32 text-center">
      <p className="eyebrow">{t.eyebrow}</p>
      <p className="grad-text mt-6 font-firs text-[96px] font-semibold leading-none sm:text-[140px]">
        404
      </p>
      <h1 className="mt-4 font-firs text-2xl font-semibold uppercase tracking-tight text-ink">
        {t.title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink/70">{t.desc}</p>
      <Link href={`/${locale}`} className="btn-teal group mt-10">
        {t.cta}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

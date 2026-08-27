import Link from "next/link";
import { REGISTER_URL } from "@/lib/content";
import { localePath } from "@/lib/locale";
import type { Dict } from "@/lib/i18n";
import { ArrowUpRight, Sparkles } from "./ui";

const NAV = [
  { path: "/", key: "home" },
  { path: "/submit", key: "submit" },
  { path: "/projects", key: "projects" },
  { path: "/prizes", key: "prizes" },
  { path: "/schedule", key: "schedule" },
  { path: "/faq", key: "faq" },
] as const;

export default function Footer({
  locale,
  dict,
}: {
  locale: string;
  dict: Dict;
}) {
  const t = dict.footer;
  const external = [
    { href: REGISTER_URL, label: t.register },
    { href: "https://www.bnbchain.org/en/hackathons", label: t.bnbHackathons },
  ];

  return (
    <footer className="relative overflow-hidden bg-haze px-6 pb-10 pt-16 sm:px-10 sm:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-t border-teal/15 pt-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-ink">
              <Sparkles className="h-6 w-6" />
              <span className="leading-none">
                <span className="block text-[15px] font-semibold tracking-tight">
                  {dict.brand.line1}
                </span>
                <span className="-mt-0.5 block text-[11px] font-light opacity-80">
                  {dict.brand.line2}
                </span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/70">
              {t.tagline}
            </p>
          </div>

          <div>
            <p className="eyebrow mb-4">{t.navHeading}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.path}
                  href={localePath(locale, n.path)}
                  className="text-ink/70 transition hover:text-teal"
                >
                  {dict.nav[n.key]}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-4">{t.eventHeading}</p>
            <div className="space-y-2.5 text-sm">
              {external.map((e) => (
                <a
                  key={e.href}
                  href={e.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1.5 text-ink/70 transition hover:text-teal"
                >
                  {e.label}
                  <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ))}
              <p className="text-ink/50">{t.community}</p>
            </div>
          </div>
        </div>

        {/*
          Watermark. Dulu <p> ber-text-[11vw]: lebarnya diikat ke viewport,
          bukan ke kontainer, jadi selalu meluber dan terpotong overflow-hidden.
          textLength + lengthAdjust memaksa teks pas selebar viewBox, sehingga
          skalanya mengikuti kontainer dan tak pernah terpotong.
        */}
        <svg
          viewBox="0 0 1000 120"
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none mt-14 w-full select-none text-teal/[0.07]"
          aria-hidden
          role="presentation"
        >
          <text
            x="0"
            y="102"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            fontSize="120"
            fontWeight="600"
            fill="currentColor"
            className="font-firs"
          >
            #WHEREBUILDERSBUILD
          </text>
        </svg>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-teal/15 pt-6 text-[10px] uppercase tracking-[0.18em] text-ink/50 sm:flex-row">
          <p>{t.copyright}</p>
          <p>{t.builtOn}</p>
        </div>
      </div>
    </footer>
  );
}

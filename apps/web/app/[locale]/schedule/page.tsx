import { getCurrentHackathon } from "@iw3h/db";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Panel } from "@/components/ui";
import { REGISTER_URL } from "@/lib/content";
import { getDict, localePath } from "@/lib/i18n";
import { ogMeta } from "@/lib/og-meta";
import { db } from "@/lib/turso";

// ISR: tanggal dari DB (backoffice) tercermin di sini, refresh tiap 10 menit.
export const revalidate = 600;

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const title = getDict(params.locale).schedule.metaTitle;
  return { title, ...ogMeta("schedule", `${title} · Indonesia Web3 Hackathon 2026`) };
}

/** Format tanggal WIB. `withTime` → "…, 23:59 WIB" (untuk deadline). */
function fmtDate(iso: string | null | undefined, locale: string, withTime = false): string | null {
  if (!iso) return null;
  const d = new Date(
    iso.length === 10 ? `${iso}T${withTime ? "23:59:59" : "00:00:00"}+07:00` : iso
  );
  if (Number.isNaN(d.getTime())) return null;
  const loc = locale === "id" ? "id-ID" : "en-GB";
  const date = new Intl.DateTimeFormat(loc, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
  if (!withTime) return date;
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(d);
  return `${date}, ${time} WIB`;
}

export default async function SchedulePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = getDict(params.locale).schedule;

  // Tanggal DB (kalau diisi di backoffice) override konten statis per item timeline.
  const h = await getCurrentHackathon(db).catch(() => null);
  const dbDate: Record<string, string | null> = {
    registration: fmtDate(h?.registrationOpensAt, params.locale),
    "submission-open": fmtDate(h?.submissionOpensAt, params.locale),
    "submission-close": fmtDate(h?.submissionClosesAt, params.locale),
    "demo-day": fmtDate(h?.winnersAnnouncedAt, params.locale),
  };
  const deadlineDate = fmtDate(h?.submissionClosesAt, params.locale, true) ?? t.deadlineDate;

  return (
    <div className="min-h-full bg-haze">
      <div className="page-wrap">
        <p className="eyebrow">{t.eyebrow}</p>
        <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h1 className="page-title">
            {t.title1}
            <br />
            {t.title2}
          </h1>
        </div>

        <div className="mt-14 space-y-3">
          {t.timeline.map((item, i) => (
            <Panel
              key={item.key}
              clip="chamfer-lg"
              tone={i < 2 ? "bg-white/[0.04]" : "bg-white/[0.02]"}
            >
              <div className="grid gap-4 p-6 md:grid-cols-[70px_250px_1fr_auto] md:items-center md:gap-8 md:p-8">
                <p
                  className={`font-firs text-3xl font-semibold ${
                    i < 2 ? "grad-text" : "text-white/40"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-teal/80">
                    {dbDate[item.key] ?? item.date}
                  </p>
                  <h2 className="mt-1 font-firs text-xl font-semibold uppercase tracking-tight text-ink">
                    {item.title}
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-ink/70">{item.desc}</p>
                <div className="md:justify-self-end">
                  {item.key === "submission-open" && (
                    <Link href={localePath(params.locale, "/submit")} className="btn-teal">
                      {t.submit}
                    </Link>
                  )}
                  {item.key === "registration" && (
                    <a
                      href={REGISTER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-teal"
                    >
                      {t.register}
                      <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <Panel clip="chamfer-lg" className="mt-8">
          <div className="flex flex-col items-center justify-between gap-4 p-6 text-center sm:flex-row sm:text-left md:p-8">
            <p className="text-sm leading-relaxed text-ink/80">
              {t.deadlineNote} <strong className="font-semibold text-teal">{deadlineDate}</strong>
              {t.deadlineTail}
            </p>
            <Link href={localePath(params.locale, "/submit")} className="btn-teal shrink-0">
              {t.submitNow}
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}

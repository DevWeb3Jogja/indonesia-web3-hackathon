import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Panel } from "@/components/ui";
import { REGISTER_URL } from "@/lib/content";
import { getDict, localePath } from "@/lib/i18n";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return { title: getDict(params.locale).schedule.metaTitle };
}

export default async function SchedulePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = getDict(params.locale).schedule;

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
              tone={i < 2 ? "bg-white/[0.04]" : "bg-white/[0.08]"}
              soft={i >= 2}
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
                    {item.date}
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
              {t.deadlineNote} <strong className="font-semibold text-teal">{t.deadlineDate}</strong>
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

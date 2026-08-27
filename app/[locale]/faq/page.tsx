import Link from "next/link";
import type { Metadata } from "next";
import FaqAccordion from "@/components/FaqAccordion";
import { REGISTER_URL } from "@/lib/content";
import { getDict, localePath } from "@/lib/i18n";
import { ArrowUpRight } from "@/components/ui";

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  return { title: getDict(params.locale).faq.metaTitle };
}

export default function FaqPage({ params }: { params: { locale: string } }) {
  const t = getDict(params.locale).faq;

  return (
    <div className="min-h-full bg-haze">
      <div className="page-wrap">
        <div className="grid gap-12 lg:grid-cols-[360px_1fr]">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className="page-title mt-4">
              {t.title1}
              <br />
              {t.title2}
            </h1>
            <p className="mt-5 max-w-xs text-[17px] leading-[1.5] text-ink/80">
              {t.lead}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
              <Link
                href={localePath(params.locale, "/submit")}
                className="btn-teal group"
              >
                {t.submitCta}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href={REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 text-sm font-medium text-ink"
              >
                {t.eventPage}
                <span className="chamfer-sm flex h-8 w-8 items-center justify-center border border-ink transition duration-200 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </a>
            </div>
          </div>
          <FaqAccordion items={t.items} />
        </div>
      </div>
    </div>
  );
}

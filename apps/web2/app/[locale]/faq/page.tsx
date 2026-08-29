import type { Metadata } from "next";
import Link from "next/link";
import FaqAccordion from "@/components/FaqAccordion";
import { ArrowUpRight } from "@/components/ui";
import { REGISTER_URL } from "@/lib/content";
import { getDict, localePath } from "@/lib/i18n";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return { title: getDict(params.locale).faq.metaTitle };
}

export default async function FaqPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
              <Link href={localePath(params.locale, "/submit")} className="btn-teal group">
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

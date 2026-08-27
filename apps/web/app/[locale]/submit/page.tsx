import type { Metadata } from "next";
import ProjectSubmit from "@/components/ProjectSubmit";
import { getDict } from "@/lib/i18n";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDict(params.locale).submit.metaTitle };
}

export default function SubmitPage({ params }: { params: { locale: string } }) {
  const dict = getDict(params.locale);
  const t = dict.submit;

  return (
    <div className="min-h-full bg-haze">
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 sm:px-10 sm:pt-32">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="page-title mt-4">
          {t.title1} {t.title2}
        </h1>
        <div className="mt-8">
          <ProjectSubmit locale={params.locale} t={dict.psubmit} form={dict.form} />
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import ProjectsBrowser from "@/components/ProjectsBrowser";
import { getDict } from "@/lib/i18n";

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  return { title: getDict(params.locale).projects.metaTitle };
}

export default function ProjectsPage({ params }: { params: { locale: string } }) {
  const t = getDict(params.locale).projects;

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
          <p className="max-w-sm text-[17px] leading-[1.5] text-ink/80">{t.lead}</p>
        </div>

        <ProjectsBrowser locale={params.locale} t={t} />
      </div>
    </div>
  );
}

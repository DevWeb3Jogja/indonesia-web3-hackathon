import type { Metadata } from "next";
import ProjectsBrowser from "@/components/ProjectsBrowser";
import { getDict } from "@/lib/i18n";
import { ogMeta } from "@/lib/og-meta";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const title = getDict(params.locale).projects.metaTitle;
  return { title, ...ogMeta("projects", `${title} · Indonesia Web3 Hackathon 2026`) };
}

export default async function ProjectsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
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
        </div>

        <ProjectsBrowser locale={params.locale} t={t} />
      </div>
    </div>
  );
}

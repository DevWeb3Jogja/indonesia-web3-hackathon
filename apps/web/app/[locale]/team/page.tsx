import type { Metadata } from "next";
import TeamPanel from "@/components/TeamPanel";
import { getDict } from "@/lib/i18n";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return { title: getDict(params.locale).team.metaTitle, robots: { index: false } };
}

export default async function TeamPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = getDict(params.locale).team;

  return (
    <div className="min-h-full bg-haze">
      <div className="page-wrap">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="page-title mt-4">
          {t.title1} {t.title2}
        </h1>
        <div className="mt-10">
          <TeamPanel t={t} />
        </div>
      </div>
    </div>
  );
}

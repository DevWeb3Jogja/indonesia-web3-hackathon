import type { Metadata } from "next";
import TeamPanel from "@/components/TeamPanel";
import { getDict } from "@/lib/i18n";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDict(params.locale).team.metaTitle, robots: { index: false } };
}

export default function TeamPage({ params }: { params: { locale: string } }) {
  const t = getDict(params.locale).team;

  return (
    <div className="min-h-full bg-haze">
      <div className="page-wrap">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="page-title mt-4">
          {t.title1} {t.title2}
        </h1>
        <p className="mt-4 max-w-lg text-[17px] leading-[1.5] text-ink/80">{t.lead}</p>
        <div className="mt-10">
          <TeamPanel t={t} />
        </div>
      </div>
    </div>
  );
}

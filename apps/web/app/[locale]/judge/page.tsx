import type { Metadata } from "next";
import JudgePanel from "@/components/JudgePanel";
import { getDict } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).judge.metaTitle, robots: { index: false } };
}

export default async function JudgePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale).judge;

  return (
    <div className="min-h-full bg-haze">
      <div className="page-wrap">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="page-title mt-4">
          {t.title1} {t.title2}
        </h1>
        <div className="mt-10">
          <JudgePanel t={t} />
        </div>
      </div>
    </div>
  );
}

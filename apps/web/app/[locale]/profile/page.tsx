import type { Metadata } from "next";
import ProfileForm from "@/components/ProfileForm";
import { getDict } from "@/lib/i18n";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return { title: getDict(params.locale).profile.metaTitle, robots: { index: false } };
}

export default async function ProfilePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = getDict(params.locale).profile;

  return (
    <div className="min-h-full bg-haze">
      <div className="page-wrap">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="page-title mt-4">
          {t.title1} {t.title2}
        </h1>
        <p className="mt-4 max-w-lg text-[17px] leading-[1.5] text-ink/80">{t.lead}</p>
        <div className="mt-10">
          <ProfileForm t={t} />
        </div>
      </div>
    </div>
  );
}

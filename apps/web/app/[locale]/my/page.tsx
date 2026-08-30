import type { Metadata } from "next";
import MyProjectPanel from "@/components/MyProjectPanel";
import TeamPanel from "@/components/TeamPanel";
import { getDict } from "@/lib/i18n";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return { title: getDict(params.locale).submit.metaTitle, robots: { index: false } };
}

/** "My Projects" — ringkas: tombol submit (→ halaman fokus /submit) + kelola tim. */
export default async function MyPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dict = getDict(locale);

  return (
    <div className="min-h-full">
      <div className="page-wrap">
        <p className="eyebrow">{dict.nav.profile}</p>
        <h1 className="page-title mt-4">My Projects</h1>

        <div className="mt-8">
          <MyProjectPanel locale={locale} t={dict.psubmit} />
        </div>

        <section className="mt-16 border-t border-white/10 pt-12">
          <h2 className="section-title mb-2">{dict.team.title2 || "Team"}</h2>
          <p className="mb-6 max-w-lg text-sm leading-relaxed text-white/60">{dict.team.lead}</p>
          <TeamPanel t={dict.team} />
        </section>
      </div>
    </div>
  );
}

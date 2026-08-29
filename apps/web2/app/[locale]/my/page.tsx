import type { Metadata } from "next";
import Link from "next/link";
import TeamPanel from "@/components/TeamPanel";
import { ArrowUpRight } from "@/components/ui";
import { getDict, localePath } from "@/lib/i18n";

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
        <p className="mt-4 max-w-lg text-[17px] leading-[1.5] text-white/70">
          Submit and manage your project, and manage your team — all in one place.
        </p>

        <div className="mt-8">
          <Link href={localePath(locale, "/submit")} className="btn-teal">
            {dict.psubmit.openCta}
            <ArrowUpRight />
          </Link>
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

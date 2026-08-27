import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmission, toPublic } from "@/lib/db";
import { explorerUrl, trackLabel, NETWORKS } from "@/lib/types";
import { getDict, localePath } from "@/lib/i18n";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { ArrowUpRight, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const stored = await getSubmission(params.id);
  if (!stored) notFound();
  const p = toPublic(stored);
  const network = NETWORKS.find((n) => n.id === p.network);

  const dict = getDict(params.locale);
  const t = dict.projectDetail;
  const path = (s: string) => localePath(params.locale, s);
  const dateLocale = params.locale === "en" ? "en-GB" : "id-ID";

  return (
    <div className="min-h-full bg-haze">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-28 sm:px-10 sm:pt-32">
        <Link
          href={path("/projects")}
          className="text-[10px] uppercase tracking-[0.2em] text-teal/70 transition hover:text-teal"
        >
          {t.back}
        </Link>

        {/* Header */}
        <Panel clip="chamfer-lg" className="mt-6">
          <div>
            <div className="h-1 w-full bg-teal" />
            <div className="p-6 md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-5">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logoUrl}
                      alt=""
                      className="chamfer-sm h-16 w-16 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="chamfer-sm flex h-16 w-16 shrink-0 items-center justify-center bg-teal/10 font-firs text-2xl font-semibold text-teal">
                      {p.projectName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="font-firs text-3xl font-semibold uppercase tracking-tight text-ink md:text-4xl">
                      {p.projectName}
                    </h1>
                    <p className="mt-1 text-sm text-ink/55">
                      {t.by} {p.teamName}
                    </p>
                    {p.tagline && (
                      <p className="mt-3 max-w-xl leading-relaxed text-ink/80">
                        {p.tagline}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.tracks.map((tr) => (
                        <span key={tr} className="tag">
                          {trackLabel(tr)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <Link
                  href={path(`/projects/${p.id}/edit`)}
                  className="btn-outline shrink-0 border border-teal/25"
                >
                  {t.edit}
                </Link>
              </div>

              {/* Tautan cepat */}
              <div className="mt-8 flex flex-wrap gap-3 border-t border-teal/15 pt-6">
                <a
                  href={explorerUrl(p.network, p.contractAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chamfer-sm inline-flex items-center gap-2 bg-teal px-4 py-2 text-sm font-medium text-white transition hover:brightness-125"
                >
                  {t.contract}
                  <span className="hidden font-mono text-xs opacity-70 sm:inline">
                    {p.contractAddress.slice(0, 6)}…{p.contractAddress.slice(-4)}
                  </span>
                </a>
                <a
                  href={p.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-chip"
                >
                  {t.github}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
                {p.demoUrl && (
                  <a
                    href={p.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-chip"
                  >
                    {t.liveDemo}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
                {p.extraLinks.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-chip"
                  >
                    {l.label || t.link}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ))}
              </div>
              {network && (
                <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-teal/70">
                  {t.network} · {network.label}
                </p>
              )}
            </div>
          </div>
        </Panel>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <section>
              <p className="eyebrow mb-4">{t.videoDemo}</p>
              <YouTubeEmbed url={p.demoVideoUrl} label={t.watchVideo} />
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <Panel clip="chamfer-lg" tone="bg-white/60" soft>
                <div className="p-6 md:p-7">
                  <p className="eyebrow">{t.problem}</p>
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/80">
                    {p.problemStatement}
                  </p>
                </div>
              </Panel>
              <Panel clip="chamfer-lg">
                <div className="p-6 md:p-7">
                  <p className="eyebrow">{t.solution}</p>
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/80">
                    {p.solution}
                  </p>
                </div>
              </Panel>
            </section>

            <Panel clip="chamfer-lg">
              <section className="p-6 md:p-8">
                <p className="eyebrow mb-6">{t.detail}</p>
                <MarkdownRenderer
                  content={p.description}
                  errorLabel={dict.form.mermaidError}
                />
              </section>
            </Panel>
          </div>

          {/* Sidebar tim */}
          <aside className="space-y-5">
            <Panel clip="chamfer-lg">
              <div className="p-6">
                <p className="eyebrow">
                  {t.team} · {p.teamName}
                </p>
                <ul className="mt-5 space-y-4">
                  {p.teamMembers.map((m, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="chamfer-sm flex h-9 w-9 shrink-0 items-center justify-center bg-teal/10 font-firs text-sm font-semibold text-teal">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{m.name}</p>
                        {m.role && <p className="text-xs text-ink/55">{m.role}</p>}
                        {m.social && (
                          <a
                            href={m.social}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-teal hover:underline"
                          >
                            {t.social}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
            <Panel clip="chamfer-lg" tone="bg-white/60" soft>
              <div className="p-6 text-[10px] uppercase tracking-[0.14em] text-ink/55">
                <p>
                  {t.submitted} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString(dateLocale)}
                </p>
                {p.updatedAt !== p.createdAt && (
                  <p className="mt-2">
                    {t.lastEdit} ·{" "}
                    {new Date(p.updatedAt).toLocaleDateString(dateLocale)}
                  </p>
                )}
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

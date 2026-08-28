import { getProjectById, getPublicProfiles } from "@iw3h/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { ArrowUpRight, Panel } from "@/components/ui";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { getDict, localePath } from "@/lib/i18n";
import { db } from "@/lib/turso";
import { explorerUrl, NETWORKS, type NetworkId, trackLabel } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ExtraLink {
  label: string;
  url: string;
}

function parseLinks(raw: string | null | undefined): ExtraLink[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((l) => l?.url) : [];
  } catch {
    return [];
  }
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const p = await getProjectById(db, params.id);
  if (p?.status !== "submitted") notFound();

  const memberAddresses = p.team ? p.team.memberAddresses : [p.submitterAddress];
  const profiles = await getPublicProfiles(db, memberAddresses);
  const profileOf = (addr: string) => profiles.find((x) => x.address === addr);

  const network = p.network ? NETWORKS.find((n) => n.id === p.network) : undefined;
  const extraLinks = parseLinks(p.extraLinks);

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
              <div className="flex items-start gap-5">
                {p.logoUrl ? (
                  <img
                    src={p.logoUrl}
                    alt=""
                    className="chamfer-sm h-16 w-16 shrink-0 object-cover"
                  />
                ) : (
                  <div className="chamfer-sm flex h-16 w-16 shrink-0 items-center justify-center bg-teal/10 font-firs text-2xl font-semibold text-teal">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="font-firs text-3xl font-semibold uppercase tracking-tight text-ink md:text-4xl">
                    {p.name}
                  </h1>
                  <p className="mt-1 text-sm text-ink/55">
                    {p.team ? `${t.by} ${p.team.name}` : t.solo}
                  </p>
                  {p.tagline && (
                    <p className="mt-3 max-w-xl leading-relaxed text-ink/80">{p.tagline}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.trackIds.map((tr) => (
                      <span key={tr} className="tag">
                        {trackLabel(tr)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tautan cepat */}
              <div className="mt-8 flex flex-wrap gap-3 border-t border-teal/15 pt-6">
                {p.contractAddress && network && (
                  <a
                    href={explorerUrl(p.network as NetworkId, p.contractAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chamfer-sm inline-flex items-center gap-2 bg-teal px-4 py-2 text-sm font-medium text-white transition hover:brightness-125"
                  >
                    {t.contract}
                    <span className="hidden font-mono text-xs opacity-70 sm:inline">
                      {short(p.contractAddress)}
                    </span>
                  </a>
                )}
                {p.githubUrl && (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-chip"
                  >
                    {t.github}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
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
                {extraLinks.map((l) => (
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
            {p.demoVideoUrl && (
              <section>
                <p className="eyebrow mb-4">{t.videoDemo}</p>
                <YouTubeEmbed url={p.demoVideoUrl} label={t.watchVideo} />
              </section>
            )}

            {(p.problemStatement || p.solution) && (
              <section className="grid gap-5 md:grid-cols-2">
                {p.problemStatement && (
                  <Panel clip="chamfer-lg" tone="bg-white/60" soft>
                    <div className="p-6 md:p-7">
                      <p className="eyebrow">{t.problem}</p>
                      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/80">
                        {p.problemStatement}
                      </p>
                    </div>
                  </Panel>
                )}
                {p.solution && (
                  <Panel clip="chamfer-lg">
                    <div className="p-6 md:p-7">
                      <p className="eyebrow">{t.solution}</p>
                      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/80">
                        {p.solution}
                      </p>
                    </div>
                  </Panel>
                )}
              </section>
            )}

            {p.description && (
              <Panel clip="chamfer-lg">
                <section className="p-6 md:p-8">
                  <p className="eyebrow mb-6">{t.detail}</p>
                  <MarkdownRenderer content={p.description} errorLabel={dict.form.mermaidError} />
                </section>
              </Panel>
            )}
          </div>

          {/* Sidebar tim / builder */}
          <aside className="space-y-5">
            <Panel clip="chamfer-lg">
              <div className="p-6">
                <p className="eyebrow">{p.team ? `${t.team} · ${p.team.name}` : t.solo}</p>
                <ul className="mt-5 space-y-4">
                  {memberAddresses.map((addr) => {
                    const prof = profileOf(addr);
                    const name = prof?.username || short(addr);
                    const link = prof?.githubUrl || prof?.twitterUrl;
                    return (
                      <li key={addr} className="flex items-start gap-3">
                        {prof?.avatarUrl ? (
                          <img
                            src={prof.avatarUrl}
                            alt=""
                            className="chamfer-sm h-9 w-9 shrink-0 object-cover"
                          />
                        ) : (
                          <span className="chamfer-sm flex h-9 w-9 shrink-0 items-center justify-center bg-teal/10 font-firs text-sm font-semibold text-teal">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{name}</p>
                          <p className="truncate font-mono text-[11px] text-ink/45">
                            {short(addr)}
                          </p>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-teal hover:underline"
                            >
                              {t.viewProfile}
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Panel>
            <Panel clip="chamfer-lg" tone="bg-white/60" soft>
              <div className="p-6 text-[10px] uppercase tracking-[0.14em] text-ink/55">
                {p.submittedAt && (
                  <p>
                    {t.submitted} · {new Date(p.submittedAt).toLocaleDateString(dateLocale)}
                  </p>
                )}
                {p.updatedAt !== p.createdAt && (
                  <p className="mt-2">
                    {t.lastEdit} · {new Date(p.updatedAt).toLocaleDateString(dateLocale)}
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

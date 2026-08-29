import { getProjectById, getPublicProfiles } from "@iw3h/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GeneratedAvatar } from "@/components/GeneratedAvatar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { ArrowUpRight } from "@/components/ui";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { getDict, localePath } from "@/lib/i18n";
import { db } from "@/lib/turso";
import { explorerUrl, NETWORKS, type NetworkId, trackLabel } from "@/lib/types";

// ISR: cache render per-id 30s — lindungi DB dari hammering, edit tampil dalam ≤30s.
export const revalidate = 30;

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

/** Escape literal "\n" (mis. seed) → baris baru asli. */
const unescapeNewlines = (s: string) => s.replace(/\\r\\n|\\n/g, "\n");

export default async function ProjectDetailPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
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
  const submitted = p.submittedAt
    ? new Date(p.submittedAt).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-full bg-haze">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-24 sm:px-8 sm:pt-28">
        <Link
          href={path("/projects")}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-white/45 transition hover:text-white"
        >
          {t.back}
        </Link>

        {/* ---------- Hero ---------- */}
        <header className="mt-8">
          <div className="flex items-start gap-5">
            {p.logoUrl ? (
              <img
                src={p.logoUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/5 font-firs text-2xl font-semibold text-white/80 ring-1 ring-white/10">
                {p.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-firs text-[32px] font-semibold uppercase leading-[0.95] tracking-tight text-white sm:text-[42px]">
                {p.name}
              </h1>
              <p className="mt-2 text-sm text-white/50">
                {p.team ? `${t.by} ${p.team.name}` : t.solo}
              </p>
            </div>
          </div>

          {p.tagline && (
            <p className="mt-6 text-[17px] leading-relaxed text-white/75">{p.tagline}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {p.trackIds.map((tr) => (
              <span key={tr} className="tag">
                {trackLabel(tr)}
              </span>
            ))}
            {network && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                · {t.network} {network.label}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {p.contractAddress && network && (
              <a
                href={explorerUrl(p.network as NetworkId, p.contractAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
              >
                {t.contract}
                <span className="font-mono text-xs opacity-60">{short(p.contractAddress)}</span>
              </a>
            )}
            {p.githubUrl && (
              <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="link-chip">
                {t.github}
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
            {p.demoUrl && (
              <a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="link-chip">
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
        </header>

        {/* ---------- Team ---------- */}
        <section className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-y border-white/10 py-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {p.team ? `${t.team} · ${p.team.name}` : t.solo}
          </p>
          {memberAddresses.map((addr) => {
            const prof = profileOf(addr);
            const name = prof?.username || short(addr);
            const link = prof?.githubUrl || prof?.twitterUrl;
            return (
              <div key={addr} className="flex items-center gap-2.5">
                <GeneratedAvatar name={addr} size={34} />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium text-white">{name}</p>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-white/45 transition hover:text-white"
                    >
                      {t.viewProfile}
                    </a>
                  ) : (
                    <p className="truncate font-mono text-[11px] text-white/35">{short(addr)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* ---------- Demo video ---------- */}
        {p.demoVideoUrl && (
          <section className="mt-10">
            <p className="eyebrow mb-4">{t.videoDemo}</p>
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
              <YouTubeEmbed url={p.demoVideoUrl} label={t.watchVideo} />
            </div>
          </section>
        )}

        {/* ---------- Problem / Solution ---------- */}
        {(p.problemStatement || p.solution) && (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            {p.problemStatement && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="eyebrow">{t.problem}</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">
                  {unescapeNewlines(p.problemStatement)}
                </p>
              </div>
            )}
            {p.solution && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="eyebrow">{t.solution}</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">
                  {unescapeNewlines(p.solution)}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ---------- Project detail ---------- */}
        {p.description && (
          <section className="mt-8">
            <p className="eyebrow mb-4">{t.detail}</p>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
              <MarkdownRenderer content={p.description} errorLabel={dict.form.mermaidError} />
            </div>
          </section>
        )}

        {/* ---------- Meta ---------- */}
        {(submitted || p.updatedAt !== p.createdAt) && (
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.14em] text-white/40">
            {submitted && (
              <span>
                {t.submitted} · {submitted}
              </span>
            )}
            {p.updatedAt !== p.createdAt && (
              <span>
                {t.lastEdit} · {new Date(p.updatedAt).toLocaleDateString(dateLocale)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { ArrowUpRight, Eye } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Member {
  address: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  occupation: string | null;
  organization: string | null;
  githubLogin: string | null;
  twitterUrl: string | null;
  role: string | null;
  isSubmitter: boolean;
}
interface Detail {
  project: {
    id: string;
    name: string;
    tagline: string | null;
    status: string;
    trackIds: string[];
    team: { name: string } | null;
    githubUrl: string | null;
    demoUrl: string | null;
    demoVideoUrl: string | null;
    extraLinks: string | null;
    contractAddress: string | null;
    network: string | null;
    problemStatement: string | null;
    solution: string | null;
    description: string | null;
    submittedAt: string | null;
    createdAt: string;
  };
  members: Member[];
}

function extraLink(raw: string | null, label: string): string {
  if (!raw) return "";
  try {
    const a = JSON.parse(raw) as { label?: string; url?: string }[];
    return (Array.isArray(a) ? a.find((l) => l.label === label)?.url : "") ?? "";
  } catch {
    return "";
  }
}

const fmtDate = (s: string | null) => (s ? s.slice(0, 16).replace("T", " ") : "");

/** Baris label→nilai kecil (grid). Kosong = tak dirender. */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-theme-sm text-gray-800 dark:text-white/90">{value}</dd>
    </div>
  );
}

/** Chip link eksternal (gold hover). */
function LinkChip({ label, href }: { label: string; href: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-theme-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:text-brand-400"
    >
      {label}
      <ArrowUpRight className="size-3.5" />
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
      {children}
    </section>
  );
}

function initials(m: Member) {
  const src = m.fullName || m.username || m.address.slice(2);
  return src.slice(0, 2).toUpperCase();
}

function Body({ d }: { d: Detail }) {
  const p = d.project;
  const links: { label: string; href: string }[] = [
    { label: "GitHub", href: p.githubUrl ?? "" },
    { label: "Website", href: p.demoUrl ?? "" },
    { label: "Demo video", href: p.demoVideoUrl ?? "" },
    { label: "Pitch deck", href: extraLink(p.extraLinks, "Pitch Deck") },
    { label: "X", href: extraLink(p.extraLinks, "X") },
    { label: "LinkedIn", href: extraLink(p.extraLinks, "LinkedIn") },
  ].filter((l) => l.href);

  return (
    <div className="space-y-6">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={p.status === "submitted" ? "default" : "secondary"}>{p.status}</Badge>
        <Badge variant="outline">{p.team ? `Team · ${p.team.name}` : "Solo"}</Badge>
        {p.trackIds.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Network" value={p.network} />
          <Field
            label="Contract"
            value={
              p.contractAddress ? (
                <span className="font-mono text-xs">{p.contractAddress}</span>
              ) : null
            }
          />
          <Field label="Submitted" value={fmtDate(p.submittedAt)} />
          <Field label="Created" value={fmtDate(p.createdAt)} />
        </dl>
      </div>

      {/* Links */}
      {links.length > 0 && (
        <Section title="Links">
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <LinkChip key={l.label} label={l.label} href={l.href} />
            ))}
          </div>
        </Section>
      )}

      {p.problemStatement && (
        <Section title="Problem">
          <p className="whitespace-pre-wrap text-theme-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {p.problemStatement}
          </p>
        </Section>
      )}
      {p.solution && (
        <Section title="Solution">
          <p className="whitespace-pre-wrap text-theme-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {p.solution}
          </p>
        </Section>
      )}
      {p.description && (
        <Section title="Description">
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-theme-sm leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
            {p.description}
          </p>
        </Section>
      )}

      {/* Members */}
      <Section title={`Members · ${d.members.length}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {d.members.map((m) => (
            <div
              key={m.address}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-theme-sm font-bold text-brand-600 dark:text-brand-400">
                  {initials(m)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {m.fullName || m.username || "—"}
                    </span>
                    {m.username && (
                      <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                        @{m.username}
                      </span>
                    )}
                    {m.isSubmitter && <Badge variant="outline">submitter</Badge>}
                    {m.role && m.role !== "participant" && (
                      <Badge variant="secondary">{m.role}</Badge>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <Field label="Email" value={m.email} />
                    <Field label="Phone" value={m.phone} />
                    <Field label="City" value={m.city} />
                    <Field
                      label="Affiliation"
                      value={[m.occupation, m.organization].filter(Boolean).join(" — ") || null}
                    />
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.githubLogin && (
                      <LinkChip
                        label={`@${m.githubLogin}`}
                        href={`https://github.com/${m.githubLogin}`}
                      />
                    )}
                    {m.twitterUrl && <LinkChip label="X / Twitter" href={m.twitterUrl} />}
                  </div>
                  <p
                    className="mt-3 truncate font-mono text-[11px] text-gray-400"
                    title={m.address}
                  >
                    {m.address}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export default function ProjectDetails({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setData(null);
    try {
      const r = await fetch(`/api/admin/projects/${id}`);
      if (r.ok) setData((await r.json()) as Detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="icon-xs"
        variant="ghost"
        title="View details"
        onClick={() => {
          setOpen(true);
          load();
        }}
      >
        <Eye />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{data?.project.name ?? name}</DialogTitle>
            <DialogDescription>
              {data?.project.tagline || "Full submission details."}
            </DialogDescription>
          </DialogHeader>
          {loading && (
            <div className="space-y-3 py-4">
              <div className="h-6 w-40 animate-pulse rounded bg-gray-100 dark:bg-white/[0.06]" />
              <div className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.06]" />
              <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.06]" />
            </div>
          )}
          {data && <Body d={data} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

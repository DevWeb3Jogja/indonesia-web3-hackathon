"use client";

import { Eye } from "lucide-react";
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{value}</dd>
    </div>
  );
}

function Ext({ label, href }: { label: string; href: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
    >
      {label}
    </a>
  );
}

function Body({ d }: { d: Detail }) {
  const p = d.project;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={p.status === "submitted" ? "default" : "secondary"}>{p.status}</Badge>
        <Badge variant="outline">{p.team ? `Team · ${p.team.name}` : "Solo"}</Badge>
        {p.trackIds.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Network" value={p.network} />
        <Field
          label="Contract"
          value={
            p.contractAddress ? (
              <span className="font-mono text-xs">{p.contractAddress}</span>
            ) : null
          }
        />
        <Field label="Submitted" value={p.submittedAt?.slice(0, 16).replace("T", " ")} />
        <Field label="Created" value={p.createdAt?.slice(0, 16).replace("T", " ")} />
      </dl>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Ext label="GitHub" href={p.githubUrl ?? ""} />
        <Ext label="Website" href={p.demoUrl ?? ""} />
        <Ext label="Demo video" href={p.demoVideoUrl ?? ""} />
        <Ext label="Pitch deck" href={extraLink(p.extraLinks, "Pitch Deck")} />
        <Ext label="X" href={extraLink(p.extraLinks, "X")} />
        <Ext label="LinkedIn" href={extraLink(p.extraLinks, "LinkedIn")} />
      </div>

      {p.problemStatement && (
        <Section title="Problem">
          <p className="whitespace-pre-wrap text-sm">{p.problemStatement}</p>
        </Section>
      )}
      {p.solution && (
        <Section title="Solution">
          <p className="whitespace-pre-wrap text-sm">{p.solution}</p>
        </Section>
      )}
      {p.description && (
        <Section title="Description">
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
            {p.description}
          </p>
        </Section>
      )}

      <Section title={`Members (${d.members.length})`}>
        <div className="space-y-3">
          {d.members.map((m) => (
            <div key={m.address} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.fullName || m.username || "—"}</span>
                {m.username && <span className="text-xs text-muted-foreground">@{m.username}</span>}
                {m.isSubmitter && <Badge variant="outline">submitter</Badge>}
                {m.role && m.role !== "participant" && <Badge variant="secondary">{m.role}</Badge>}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Field label="Email" value={m.email} />
                <Field label="Phone" value={m.phone} />
                <Field label="City" value={m.city} />
                <Field
                  label="Affiliation"
                  value={[m.occupation, m.organization].filter(Boolean).join(" — ") || null}
                />
                <Field
                  label="GitHub"
                  value={
                    m.githubLogin ? (
                      <Ext
                        label={`@${m.githubLogin}`}
                        href={`https://github.com/${m.githubLogin}`}
                      />
                    ) : null
                  }
                />
                <Field
                  label="X / Twitter"
                  value={m.twitterUrl ? <Ext label="link" href={m.twitterUrl} /> : null}
                />
              </dl>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">{m.address}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
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
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{data?.project.name ?? name}</DialogTitle>
            {data?.project.tagline ? (
              <DialogDescription>{data.project.tagline}</DialogDescription>
            ) : (
              <DialogDescription>Full submission details.</DialogDescription>
            )}
          </DialogHeader>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {data && <Body d={data} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

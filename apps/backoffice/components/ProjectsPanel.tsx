"use client";

import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DemoDayToggle from "./DemoDayToggle";
import PagedList from "./PagedList";
import ProjectActions from "./ProjectActions";
import ProjectDetails from "./ProjectDetails";

interface P {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  team: { name: string; memberAddresses: string[] } | null;
  trackIds: string[];
  status: string;
  submittedAt: string | null;
  demoDay: boolean;
}

// Logo upload disimpan sebagai path relatif situs web (/api/uploads/...), bukan backoffice.
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://indonesiaweb3hack.xyz";
const logoSrc = (u: string) => (u.startsWith("/") ? WEB_URL + u : u);

// Mayoritas baris "submitted" → warna kalem; yang perlu perhatian (draft/DQ) yang menonjol.
const STATUS_CLASS: Record<string, string> = {
  submitted: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  draft: "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400",
  disqualified: "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400",
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";

export default function ProjectsPanel({ tracks }: { tracks: { id: string; name: string }[] }) {
  const trackName = (id: string) => tracks.find((t) => t.id === id)?.name ?? id;

  return (
    <PagedList<P>
      endpoint="/api/admin/projects"
      rowKey={(p) => p.id}
      searchPlaceholder="Search name / tagline…"
      toolbar={
        <>
          <Button asChild size="sm" variant="outline">
            <a href="/api/admin/projects/export?format=xlsx" download>
              <Download className="size-4" />
              Excel
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="/api/admin/projects/export" download>
              <Download className="size-4" />
              CSV
            </a>
          </Button>
        </>
      }
      filters={[
        {
          key: "status",
          label: "Status",
          options: [
            { value: "submitted", label: "Submitted" },
            { value: "draft", label: "Draft" },
            { value: "disqualified", label: "Disqualified" },
          ],
        },
        {
          key: "track",
          label: "Track",
          options: tracks.map((t) => ({ value: t.id, label: t.name })),
        },
        {
          key: "finalist",
          label: "Finalist",
          options: [
            { value: "yes", label: "Finalist only" },
            { value: "no", label: "Not finalist" },
          ],
        },
      ]}
      sorts={[
        { value: "newest", label: "Newest" },
        { value: "oldest", label: "Oldest" },
        { value: "name", label: "Name A-Z" },
      ]}
      columns={[
        {
          header: "Project",
          cell: (p) => (
            <div className="flex max-w-xs min-w-52 items-center gap-3">
              {p.logoUrl ? (
                <img
                  src={logoSrc(p.logoUrl)}
                  alt=""
                  loading="lazy"
                  className="size-9 shrink-0 rounded-lg bg-gray-100 object-cover dark:bg-white/[0.06]"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                  {p.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800 dark:text-white/90">{p.name}</p>
                {p.tagline && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{p.tagline}</p>
                )}
              </div>
            </div>
          ),
        },
        {
          header: "Team",
          cell: (p) =>
            p.team ? (
              <span className="whitespace-nowrap">
                {p.team.name}
                <span className="ml-1 text-xs text-gray-400">
                  · {p.team.memberAddresses.length}
                </span>
              </span>
            ) : (
              <span className="text-gray-400">Solo</span>
            ),
        },
        {
          header: "Tracks",
          cell: (p) =>
            p.trackIds.length ? (
              <div className="flex flex-wrap gap-1">
                {p.trackIds.map((t) => (
                  <Badge key={t} variant="outline">
                    {trackName(t)}
                  </Badge>
                ))}
              </div>
            ) : (
              <Badge variant="destructive">No track</Badge>
            ),
        },
        {
          header: "Status",
          cell: (p) => (
            <Badge variant="secondary" className={`capitalize ${STATUS_CLASS[p.status] ?? ""}`}>
              {p.status}
            </Badge>
          ),
        },
        {
          header: "Submitted",
          cell: (p) => (
            <span className="whitespace-nowrap text-gray-500 tabular-nums dark:text-gray-400">
              {fmtDate(p.submittedAt)}
            </span>
          ),
        },
        {
          header: "",
          // Bintang = finalis demo day; ⋯ = aksi lain (edit / disqualify / delete).
          cell: (p, reload) => (
            <div className="flex items-center justify-end gap-1">
              <DemoDayToggle id={p.id} demoDay={p.demoDay} onChanged={reload} />
              <ProjectDetails id={p.id} name={p.name} />
              <ProjectActions
                id={p.id}
                name={p.name}
                tagline={p.tagline}
                status={p.status}
                onChanged={reload}
              />
            </div>
          ),
        },
      ]}
    />
  );
}

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
import { short } from "@/lib/utils";

export interface AdminUser {
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
  bio: string | null;
  role: string;
  stage: string | null;
  createdAt: string;
}

const STAGE_META: Record<string, { label: string; dot: string }> = {
  connected: { label: "Just connected", dot: "bg-zinc-400" },
  profileStarted: { label: "Profile started", dot: "bg-amber-400" },
  profileComplete: { label: "Profile complete", dot: "bg-sky-500" },
  team: { label: "In a team", dot: "bg-violet-500" },
  submitted: { label: "Submitted", dot: "bg-emerald-500" },
};

export function StageBadge({ stage }: { stage: string | null }) {
  const m = stage ? STAGE_META[stage] : null;
  if (!m) return <span className="text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
      <span className={`size-2 shrink-0 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-theme-sm text-gray-800 dark:text-white/90">{value}</dd>
    </div>
  );
}

function Ext({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
    >
      {label}
      <ArrowUpRight className="size-3.5" />
    </a>
  );
}

export default function UserDetails({ user: u }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);
  const affiliation = [u.occupation, u.organization].filter(Boolean).join(" — ");
  return (
    <>
      <Button size="icon-xs" variant="ghost" title="View details" onClick={() => setOpen(true)}>
        <Eye />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{u.fullName || u.username || short(u.address)}</DialogTitle>
            <DialogDescription>{u.username ? `@${u.username}` : "Participant"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={u.role === "participant" ? "secondary" : "default"}>{u.role}</Badge>
              <StageBadge stage={u.stage} />
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Email" value={u.email} />
              <Field label="Phone" value={u.phone} />
              <Field label="City" value={u.city} />
              <Field label="Affiliation" value={affiliation || null} />
              <Field
                label="GitHub"
                value={
                  u.githubLogin ? (
                    <Ext label={`@${u.githubLogin}`} href={`https://github.com/${u.githubLogin}`} />
                  ) : null
                }
              />
              <Field
                label="X / Twitter"
                value={u.twitterUrl ? <Ext label="link" href={u.twitterUrl} /> : null}
              />
              <Field label="Joined" value={u.createdAt?.slice(0, 10)} />
            </dl>
            {u.bio && (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Bio
                </h3>
                <p className="whitespace-pre-wrap text-theme-sm text-gray-700 dark:text-gray-300">
                  {u.bio}
                </p>
              </div>
            )}
            <p className="truncate font-mono text-[11px] text-gray-400" title={u.address}>
              {u.address}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

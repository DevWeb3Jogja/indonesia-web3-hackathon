"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import { trackLabel } from "@/lib/types";
import { useWallet } from "@/lib/use-wallet";
import { projectId } from "@/lib/web3";
import { ArrowUpRight } from "./ui";

type PT = Dict["psubmit"];

interface Project {
  id: string;
  name: string;
  tagline: string | null;
  teamId: string | null;
  trackIds: string[];
  logoUrl: string | null;
  team: { name: string } | null;
}
interface Mine {
  project: Project | null;
}

function SubmitButton({ locale, t }: { locale: string; t: PT }) {
  return (
    <Link href={localePath(locale, "/submit")} className="btn-teal">
      {t.openCta}
      <ArrowUpRight />
    </Link>
  );
}

/** Skeleton mirip ProjectCard (logo + baris teks). */
function CardSkeleton() {
  return (
    <div className="max-w-2xl animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-white/[0.06]" />
          <div className="h-3 w-24 rounded bg-white/[0.05]" />
        </div>
      </div>
      <div className="mt-4 h-3 w-3/4 rounded bg-white/[0.05]" />
      <div className="mt-6 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-white/[0.05]" />
        <div className="h-6 w-24 rounded-full bg-white/[0.05]" />
      </div>
    </div>
  );
}

export default function MyProjectPanel({
  locale,
  t,
  byLabel,
  soloLabel,
}: {
  locale: string;
  t: PT;
  byLabel: string;
  soloLabel: string;
}) {
  if (!projectId) return <SubmitButton locale={locale} t={t} />;
  return <Inner locale={locale} t={t} byLabel={byLabel} soloLabel={soloLabel} />;
}

function Inner({
  locale,
  t,
  byLabel,
  soloLabel,
}: {
  locale: string;
  t: PT;
  byLabel: string;
  soloLabel: string;
}) {
  const { address, isConnected, connecting } = useWallet();
  const [state, setState] = useState<"loading" | "ready" | "unauth">("loading");
  const [project, setProject] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const res = await fetch("/api/projects/mine");
    if (res.status === 401) return setState("unauth");
    const data: Mine = await res.json().catch(() => ({ project: null }));
    setProject(data.project);
    setState("ready");
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: address = pemicu re-fetch saat ganti wallet
  useEffect(() => {
    load();
  }, [load, address]);

  useEffect(() => {
    const onSession = () => load();
    window.addEventListener("iw3h:session", onSession);
    return () => window.removeEventListener("iw3h:session", onSession);
  }, [load]);

  if (connecting || (state === "loading" && isConnected)) return <CardSkeleton />;
  if (!isConnected || state === "unauth") return <SubmitButton locale={locale} t={t} />;
  if (!project) return <SubmitButton locale={locale} t={t} />;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Model sama dengan card di list project */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-start gap-4">
          {project.logoUrl ? (
            <img
              src={project.logoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 font-firs text-lg font-semibold text-white/80 ring-1 ring-white/10">
              {project.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-firs text-lg font-semibold text-white">{project.name}</h3>
            <p className="truncate text-sm text-white/50">
              {project.team ? `${byLabel} ${project.team.name}` : soloLabel}
            </p>
          </div>
        </div>
        {project.tagline && (
          <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-white/70">
            {project.tagline}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {project.trackIds.map((id) => (
            <span key={id} className="tag">
              {trackLabel(id)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`${localePath(locale, "/submit")}?edit=1`} className="btn-teal">
          {t.edit}
          <ArrowUpRight />
        </Link>
        <Link href={localePath(locale, `/projects/${project.id}`)} className="btn-outline">
          {t.viewGallery}
          <ArrowUpRight />
        </Link>
      </div>
    </div>
  );
}

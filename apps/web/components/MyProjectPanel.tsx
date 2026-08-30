"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import { trackLabel } from "@/lib/types";
import { projectId } from "@/lib/web3";
import { ArrowUpRight, Panel } from "./ui";

type PT = Dict["psubmit"];

interface Project {
  id: string;
  name: string;
  tagline: string | null;
  teamId: string | null;
  trackIds: string[];
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

/** Di /my: kalau sudah punya project → tampilkan project + tombol Edit;
 *  kalau belum → tombol "Submit a project". */
export default function MyProjectPanel({ locale, t }: { locale: string; t: PT }) {
  if (!projectId) return <SubmitButton locale={locale} t={t} />;
  return <Inner locale={locale} t={t} />;
}

function Inner({ locale, t }: { locale: string; t: PT }) {
  const { address, isConnected } = useAppKitAccount();
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

  if (!isConnected || state === "unauth") return <SubmitButton locale={locale} t={t} />;
  if (state === "loading") {
    return <div className="chamfer-lg h-40 max-w-2xl animate-pulse bg-white/[0.03]" />;
  }
  if (!project) return <SubmitButton locale={locale} t={t} />;

  return (
    <div className="max-w-2xl space-y-6">
      <Panel clip="chamfer-lg" tone="bg-white/[0.02]">
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tag">{t.submittedBadge}</span>
            <span className="tag">{project.teamId ? t.teamBadge : t.soloBadge}</span>
            {project.team && <span className="text-sm text-white/55">· {project.team.name}</span>}
          </div>
          <h2 className="section-title mt-3">{project.name}</h2>
          {project.tagline && <p className="mt-2 text-white/70">{project.tagline}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {project.trackIds.map((id) => (
              <span key={id} className="tag">
                {trackLabel(id)}
              </span>
            ))}
          </div>
        </div>
      </Panel>
      <div className="flex flex-wrap gap-3">
        <Link href={localePath(locale, "/submit")} className="btn-teal">
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

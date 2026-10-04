"use client";

import { useAppKit } from "@reown/appkit/react";
import { useCallback, useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { trackLabel } from "@/lib/types";
import { useWallet } from "@/lib/use-wallet";
import { projectId as wcProjectId } from "@/lib/web3";
import ConnectWalletButton from "./ConnectWalletButton";
import { Alert, Panel } from "./ui";
import { WalletLoading } from "./WalletLoading";

type T = Dict["judge"];
interface Criterion {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  weightPct: number;
}
interface Project {
  id: string;
  name: string;
  tagline: string | null;
  teamName: string | null;
  trackIds: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  demoVideoUrl: string | null;
}
type Notes = { teamNote: string | null; internalNote: string | null };
interface Data {
  criteria: Criterion[];
  projects: Project[];
  /** { [projectId]: { [criterionId]: 1..5 } } — hanya milik juri yang login. */
  scores: Record<string, Record<string, number>>;
  notes: Record<string, Notes>;
  canScore: boolean;
  /** Admin: pratinjau saja, tak bisa menyimpan. */
  readOnly: boolean;
}

/** Skala penjurian final (selaras FINAL_SCORE_MIN/MAX di @iw3h/db). */
const SCALE = [1, 2, 3, 4, 5] as const;

export default function JudgePanel({ t }: { t: T }) {
  if (!wcProjectId) return <Gate t={t} />;
  return <Inner t={t} />;
}

function Gate({ t, onSignIn }: { t: T; onSignIn?: () => void }) {
  return (
    <Panel className="mx-auto max-w-md" clip="chamfer-lg">
      <div className="p-8 text-center">
        <h2 className="section-title">{t.signInTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">{t.signInDesc}</p>
        <div className="mt-6 flex justify-center">
          {onSignIn ? (
            <button type="button" className="btn-teal" onClick={onSignIn}>
              {t.signInTitle}
            </button>
          ) : (
            <ConnectWalletButton className="btn-teal" />
          )}
        </div>
      </div>
    </Panel>
  );
}

function Inner({ t }: { t: T }) {
  const { address, isConnected, connecting } = useWallet();
  const { open } = useAppKit();
  const [status, setStatus] = useState<"loading" | "unauth" | "forbidden" | "ready" | "error">(
    "loading"
  );
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/judge/data");
      if (res.status === 401) return setStatus("unauth");
      if (res.status === 403) return setStatus("forbidden");
      if (!res.ok) return setStatus("error"); // 429/500/dll → jangan render data rusak
      setData(await res.json());
      setStatus("ready");
    } catch {
      setStatus("error"); // network error → tampilkan retry, bukan crash
    }
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

  if (connecting) return <WalletLoading />;
  if (!isConnected || status === "unauth") {
    return <Gate t={t} onSignIn={isConnected ? () => open() : undefined} />;
  }
  if (status === "forbidden") {
    return (
      <p className="flex items-center gap-2 text-sm text-ink/70">
        <Alert />
        {t.notJudge}
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="flex items-center gap-2 text-sm text-ink/70">
        <Alert />
        {t.error}
        <button type="button" className="btn-outline ml-2" onClick={() => load()}>
          {t.loading}
        </button>
      </p>
    );
  }
  if (status === "loading" || !data) return <p className="text-sm text-ink/60">{t.loading}</p>;

  if (!data.canScore) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink/70">
        <Alert />
        {t.closed}
      </p>
    );
  }

  const done = data.projects.filter((p) =>
    data.criteria.every((c) => (data.scores[p.id]?.[c.id] ?? 0) >= 1)
  ).length;

  return (
    <div className="space-y-6">
      {data.readOnly && (
        <p className="flex items-center gap-2 text-sm text-ink/70">
          <Alert />
          {t.readOnly}
        </p>
      )}
      <p className="text-[10px] uppercase tracking-[0.2em] text-teal/70">
        {data.projects.length} {t.projectsCount} · {done} {t.doneCount}
      </p>
      {data.projects.length === 0 && <p className="text-sm text-ink/60">{t.noFinalists}</p>}
      {data.projects.map((p) => (
        <JudgeCard
          key={p.id}
          t={t}
          project={p}
          criteria={data.criteria}
          initial={data.scores[p.id]}
          initialNotes={data.notes[p.id]}
          readOnly={data.readOnly}
        />
      ))}
    </div>
  );
}

function JudgeCard({
  t,
  project,
  criteria,
  initial,
  initialNotes,
  readOnly,
}: {
  t: T;
  project: Project;
  criteria: Criterion[];
  initial?: Record<string, number>;
  initialNotes?: Notes;
  readOnly: boolean;
}) {
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, initial?.[c.id] ?? 0]))
  );
  const [teamNote, setTeamNote] = useState(initialNotes?.teamNote ?? "");
  const [internalNote, setInternalNote] = useState(initialNotes?.internalNote ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<"saved" | "error" | null>(null);
  const [wasScored, setWasScored] = useState(
    () => criteria.length > 0 && criteria.every((c) => (initial?.[c.id] ?? 0) >= 1)
  );

  const allScored = criteria.length > 0 && criteria.every((c) => vals[c.id] >= 1);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/judge/scores", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          entries: criteria.map((c) => ({ criterionId: c.id, score: vals[c.id] })),
          teamNote: teamNote.trim() || null,
          internalNote: internalNote.trim() || null,
        }),
      });
      setMsg(res.ok ? "saved" : "error");
      if (res.ok) setWasScored(true);
    } catch {
      setMsg("error");
    } finally {
      setBusy(false);
    }
  }

  const links = [
    { href: project.demoUrl, label: t.linkDemo },
    { href: project.githubUrl, label: t.linkRepo },
    { href: project.demoVideoUrl, label: t.linkVideo },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));

  return (
    <Panel clip="chamfer-lg">
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-firs text-xl font-semibold text-ink">{project.name}</h3>
            <p className="text-sm text-ink/55">{project.teamName ?? "Solo"}</p>
            {project.tagline && <p className="mt-1 text-sm text-ink/70">{project.tagline}</p>}
            {links.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-3 text-xs">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal underline underline-offset-2 hover:text-ink"
                  >
                    {l.label}
                  </a>
                ))}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {project.trackIds.map((id) => (
              <span key={id} className="tag">
                {trackLabel(id)}
              </span>
            ))}
            {wasScored && <span className="tag">{t.scored}</span>}
          </div>
        </div>

        <p className="mt-5 text-[11px] text-ink/50">{t.scaleHint}</p>
        <div className="mt-3 space-y-4">
          {criteria.map((c) => (
            <fieldset key={c.id} className="border-t border-ink/10 pt-3" disabled={readOnly}>
              <legend className="sr-only">{c.name}</legend>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink/90" aria-hidden="true">
                    {c.name}{" "}
                    <span className="text-[11px] font-normal text-ink/50">
                      · {t.weight} {Math.round(c.weightPct * 10) / 10}%
                    </span>
                  </p>
                  {c.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink/55">{c.description}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {SCALE.map((n) => (
                    <label key={n} className="relative">
                      <input
                        type="radio"
                        name={`${project.id}-${c.id}`}
                        value={n}
                        checked={vals[c.id] === n}
                        onChange={() => setVals((v) => ({ ...v, [c.id]: n }))}
                        className="peer sr-only"
                        aria-label={`${c.name}: ${n}`}
                      />
                      <span className="flex h-9 w-9 cursor-pointer items-center justify-center border border-ink/25 text-sm tabular-nums text-ink/80 transition peer-checked:border-ink peer-checked:bg-ink peer-checked:font-semibold peer-checked:text-black peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:border-ink/60">
                        {n}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-ink/70">{t.teamNote}</span>
            <textarea
              value={teamNote}
              onChange={(e) => setTeamNote(e.target.value)}
              placeholder={t.teamNotePlaceholder}
              maxLength={2000}
              disabled={readOnly}
              className="input-field mt-1 min-h-20"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink/70">{t.internalNote}</span>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder={t.internalNotePlaceholder}
              maxLength={2000}
              disabled={readOnly}
              className="input-field mt-1 min-h-20"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-teal"
            disabled={busy || !allScored || readOnly}
            onClick={save}
          >
            {busy ? t.saving : t.save}
          </button>
          {!allScored && !readOnly && <span className="text-[11px] text-ink/50">{t.pickAll}</span>}
          <span role="status" aria-live="polite" className="text-sm">
            {msg === "saved" && <span className="text-teal">{t.saved}</span>}
            {msg === "error" && <span className="text-red-600">{t.error}</span>}
          </span>
        </div>
      </div>
    </Panel>
  );
}

"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useCallback, useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { trackLabel } from "@/lib/types";
import { projectId as wcProjectId } from "@/lib/web3";
import ConnectWalletButton from "./ConnectWalletButton";
import { Alert, Panel } from "./ui";

type T = Dict["judge"];
interface Criterion {
  id: string;
  name: string;
  weight: number;
}
interface Project {
  id: string;
  name: string;
  teamName: string | null;
  trackIds: string[];
}
type ScoreMap = Record<string, Record<string, { score: number; comment: string | null }>>;
interface Data {
  criteria: Criterion[];
  projects: Project[];
  scores: ScoreMap;
  canScore: boolean;
}

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
  const { address, isConnected } = useAppKitAccount();
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

  return (
    <div className="space-y-6">
      <p className="text-[10px] uppercase tracking-[0.2em] text-teal/70">
        {data.projects.length} {t.projectsCount}
      </p>
      {data.projects.map((p) => (
        <JudgeCard
          key={p.id}
          t={t}
          project={p}
          criteria={data.criteria}
          initial={data.scores[p.id]}
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
}: {
  t: T;
  project: Project;
  criteria: Criterion[];
  initial?: Record<string, { score: number; comment: string | null }>;
}) {
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, initial?.[c.id]?.score ?? 0]))
  );
  const [comment, setComment] = useState(
    () => Object.values(initial ?? {}).find((s) => s.comment)?.comment ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<"saved" | "error" | null>(null);

  const allScored = criteria.every((c) => vals[c.id] >= 1);
  const wasScored = initial && Object.keys(initial).length === criteria.length;

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/judge/scores", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        entries: criteria.map((c) => ({
          criterionId: c.id,
          score: vals[c.id],
          comment: comment.trim() || null,
        })),
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "saved" : "error");
  }

  return (
    <Panel clip="chamfer-lg">
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-firs text-xl font-semibold text-ink">{project.name}</h3>
            <p className="text-sm text-ink/55">{project.teamName ?? "Solo"}</p>
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

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {criteria.map((c) => (
            <label key={c.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink/80">{c.name}</span>
              <select
                value={vals[c.id]}
                onChange={(e) => setVals((v) => ({ ...v, [c.id]: Number(e.target.value) }))}
                className="input-field !w-20 !py-2"
              >
                <option value={0}>—</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.commentPlaceholder}
          maxLength={1000}
          className="input-field mt-4 min-h-16"
        />

        <div className="mt-4 flex items-center gap-3">
          <button type="button" className="btn-teal" disabled={busy || !allScored} onClick={save}>
            {busy ? t.saving : t.save}
          </button>
          {!allScored && <span className="text-[11px] text-ink/50">{t.pickAll}</span>}
          {msg === "saved" && <span className="text-sm text-teal">{t.saved}</span>}
          {msg === "error" && <span className="text-sm text-red-600">{t.error}</span>}
        </div>
      </div>
    </Panel>
  );
}

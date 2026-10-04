"use client";

import { useAppKit } from "@reown/appkit/react";
import { type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import {
  type Draft,
  fullyScored,
  indexOfProject,
  isDirty,
  stepIndex,
  swipeStep,
} from "@/lib/judge-stepper";
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
  /** Nomor urut presentasi (diatur admin) atas semua finalis. */
  position: number;
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
  // Render pertama di client WAJIB sama dengan server (server tak tahu status wallet →
  // dulu server merender Gate, client merender WalletLoading → "Hydration failed").
  // Sampai ter-mount keduanya merender WalletLoading; setelah itu logika tetap sama.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!mounted || connecting) return <WalletLoading />;
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
      {data.readOnly && (
        <p className="flex items-center gap-2 text-sm text-ink/70">
          <Alert />
          {t.readOnly}
        </p>
      )}
      {data.projects.length === 0 ? (
        <p className="text-sm text-ink/60">{t.noFinalists}</p>
      ) : (
        <Stepper t={t} data={data} />
      )}
    </div>
  );
}

const draftOf = (criteria: Criterion[], scores?: Record<string, number>, notes?: Notes): Draft => ({
  vals: Object.fromEntries(criteria.map((c) => [c.id, scores?.[c.id] ?? 0])),
  teamNote: notes?.teamNote ?? "",
  internalNote: notes?.internalNote ?? "",
});

/** Satu project sekali tampil, urut presentasi. Hanya dirender di client setelah data
 *  dimuat (tak pernah di server) → aman membaca window di initializer. */
function Stepper({ t, data }: { t: T; data: Data }) {
  const { projects, criteria, readOnly } = data;
  const critIds = useMemo(() => criteria.map((c) => c.id), [criteria]);
  // Nilai/catatan TERSIMPAN per project (baseline "belum disimpan" + tanda ✓ di chip).
  const [saved, setSaved] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      projects.map((p) => [p.id, draftOf(criteria, data.scores[p.id], data.notes[p.id])])
    )
  );
  // ?p=<projectId> → refresh tetap di project yang sama.
  const [idx, setIdx] = useState(() =>
    indexOfProject(
      projects.map((p) => p.id),
      new URLSearchParams(window.location.search).get("p")
    )
  );
  const [finished, setFinished] = useState(false);
  // Diisi kartu aktif; dibaca saat pindah (konfirmasi) & beforeunload.
  const dirty = useRef(false);
  const setDirty = useCallback((d: boolean) => {
    dirty.current = d;
  }, []);
  const touch = useRef<{ x: number; y: number } | null>(null);
  // Simpan sedang berjalan → SEMUA navigasi dikunci (chip, prev/next, swipe). Tanpa ini,
  // simpan yang selesai belakangan bisa melempar juri ke project lain & membuang editannya.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const setBusy = useCallback((b: boolean) => {
    savingRef.current = b;
    setSaving(b);
  }, []);
  // Fokus ke judul kartu hanya setelah juri pindah (bukan saat halaman pertama dibuka).
  const navigated = useRef(false);

  const current = projects[idx];
  const isScored = (id: string) => fullyScored(critIds, saved[id]?.vals);
  const done = projects.filter((p) => isScored(p.id)).length;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("p") === current.id) return;
    url.searchParams.set("p", current.id);
    window.history.replaceState(window.history.state, "", url);
  }, [current.id]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  /** Pindah project; ada perubahan belum disimpan → minta konfirmasi dulu. */
  function go(next: number | "finish") {
    if (savingRef.current) return;
    if (next === (finished ? "finish" : idx)) return;
    if (dirty.current && !window.confirm(t.discardConfirm)) return;
    dirty.current = false;
    navigated.current = true;
    if (next === "finish") return setFinished(true);
    setFinished(false);
    setIdx(next);
  }

  /** Dipanggil kartu setelah simpan sukses: perbarui baseline, lanjut tanpa konfirmasi. */
  function onSaved(projectId: string, draft: Draft, advance: boolean) {
    setSaved((s) => ({
      ...s,
      [projectId]: {
        vals: { ...draft.vals },
        teamNote: draft.teamNote.trim(),
        internalNote: draft.internalNote.trim(),
      },
    }));
    if (!advance) return;
    dirty.current = false;
    savingRef.current = false; // simpan selesai → boleh pindah
    const next = stepIndex(idx, 1, projects.length);
    go(next === null ? "finish" : next);
  }

  function onTouchStart(e: TouchEvent) {
    const el = e.target as HTMLElement;
    // Multi-touch (pinch) atau mengetik/memilih teks → bukan swipe.
    if (e.touches.length !== 1 || el.closest("textarea, input:not([type=radio]), select, a")) {
      touch.current = null;
      return;
    }
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || e.changedTouches.length === 0) return;
    const step = swipeStep(
      e.changedTouches[0].clientX - start.x,
      e.changedTouches[0].clientY - start.y
    );
    if (step === 0) return;
    if (finished) {
      if (step === -1) go(idx);
      return;
    }
    const next = stepIndex(idx, step, projects.length);
    if (next !== null) go(next);
  }

  const label = (p: Project) => t.presenter.replace("{n}", String(p.position));
  const pending = projects.filter((p) => !isScored(p.id));

  return (
    <div className="space-y-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-teal/70">
        {projects.length} {t.projectsCount} · {done} {t.doneCount}
      </p>
      <nav aria-label={t.stepperLabel}>
        <ol className="flex flex-wrap gap-2">
          {projects.map((p, i) => {
            const active = !finished && i === idx;
            const ok = isScored(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  disabled={saving}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${label(p)}: ${p.name}${ok ? ` — ${t.scored}` : ""}`}
                  title={p.name}
                  className={`flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border px-3 text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    active
                      ? "border-ink bg-ink font-semibold text-black"
                      : ok
                        ? "border-teal/60 text-teal hover:border-teal"
                        : "border-ink/25 text-ink/80 hover:border-ink/60"
                  }`}
                >
                  {p.position}
                  {ok && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <p className="text-[11px] text-ink/50 sm:hidden">{t.swipeHint}</p>

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {finished ? (
          <Panel clip="chamfer-lg">
            <div className="p-6" role="status" aria-live="polite">
              {pending.length === 0 ? (
                <h3 className="font-firs text-xl font-semibold text-ink">{t.doneTitle}</h3>
              ) : (
                <>
                  <h3 className="font-firs text-xl font-semibold text-ink">
                    {t.doneIncomplete.replace("{n}", String(pending.length))}
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {pending.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => go(projects.indexOf(p))}
                        >
                          {t.backTo.replace("{n}", String(p.position))} · {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-3 text-sm text-ink/70">{t.doneDesc}</p>
            </div>
          </Panel>
        ) : (
          <JudgeCard
            key={current.id}
            t={t}
            project={current}
            label={label(current)}
            criteria={criteria}
            saved={saved[current.id]}
            scored={isScored(current.id)}
            readOnly={readOnly}
            isFirst={idx === 0}
            isLast={idx === projects.length - 1}
            onDirty={setDirty}
            onBusy={setBusy}
            autoFocus={navigated.current}
            onPrev={() => {
              const prev = stepIndex(idx, -1, projects.length);
              if (prev !== null) go(prev);
            }}
            onNext={() => go(stepIndex(idx, 1, projects.length) ?? "finish")}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}

function JudgeCard({
  t,
  project,
  label,
  criteria,
  saved,
  scored,
  readOnly,
  isFirst,
  isLast,
  onDirty,
  onBusy,
  autoFocus,
  onPrev,
  onNext,
  onSaved,
}: {
  t: T;
  project: Project;
  label: string;
  criteria: Criterion[];
  saved: Draft;
  scored: boolean;
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  onDirty: (dirty: boolean) => void;
  /** Lapor ke Stepper: simpan sedang berjalan (navigasi dikunci). */
  onBusy: (busy: boolean) => void;
  autoFocus: boolean;
  onPrev: () => void;
  /** Pindah tanpa menyimpan (konfirmasi kalau ada perubahan). */
  onNext: () => void;
  onSaved: (projectId: string, draft: Draft, advance: boolean) => void;
}) {
  const [vals, setVals] = useState<Record<string, number>>(() => ({ ...saved.vals }));
  const [teamNote, setTeamNote] = useState(saved.teamNote);
  const [internalNote, setInternalNote] = useState(saved.internalNote);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<"saved" | "error" | null>(null);

  const critIds = criteria.map((c) => c.id);
  const draft: Draft = { vals, teamNote, internalNote };
  const dirty = !readOnly && isDirty(saved, draft, critIds);
  const allScored = fullyScored(critIds, vals);

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  // Kartu dilepas (pindah project) → tak ada lagi perubahan yang menggantung.
  useEffect(() => () => onDirty(false), [onDirty]);
  const heading = useRef<HTMLHeadingElement>(null);
  // Setelah pindah project, fokus ke judul kartu baru (keyboard/screen reader tak "hilang").
  // biome-ignore lint/correctness/useExhaustiveDependencies: hanya saat kartu dipasang
  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, []);

  async function save(advance: boolean) {
    setBusy(true);
    onBusy(true);
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
      if (res.ok) onSaved(project.id, draft, advance);
    } catch {
      setMsg("error");
    } finally {
      setBusy(false);
      onBusy(false);
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-teal/70">{label}</p>
            <h3
              ref={heading}
              tabIndex={-1}
              className="mt-1 font-firs text-xl font-semibold text-ink focus:outline-none"
            >
              {project.name}
            </h3>
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
            {scored && <span className="tag">{t.scored}</span>}
            {dirty && <span className="tag border-amber-400/60 text-amber-300">{t.unsaved}</span>}
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-outline" disabled={isFirst || busy} onClick={onPrev}>
            {t.prev}
          </button>
          <span role="status" aria-live="polite" className="text-sm">
            {busy && <span className="text-ink/60">{t.saving}</span>}
            {!busy && msg === "saved" && <span className="text-teal">{t.saved}</span>}
            {!busy && msg === "error" && <span className="text-red-600">{t.error}</span>}
          </span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            {dirty && !allScored && <span className="text-[11px] text-ink/50">{t.pickAll}</span>}
            {dirty ? (
              <>
                {/* Baru diisi sebagian → tetap bisa lewati dulu (onNext minta konfirmasi). */}
                {!allScored && !isLast && (
                  <button type="button" className="btn-outline" disabled={busy} onClick={onNext}>
                    {t.next}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-outline"
                  disabled={busy || !allScored}
                  onClick={() => save(false)}
                >
                  {t.saveOnly}
                </button>
                <button
                  type="button"
                  className="btn-teal"
                  disabled={busy || !allScored}
                  onClick={() => save(true)}
                >
                  {isLast ? t.saveFinish : t.saveNext}
                </button>
              </>
            ) : (
              // Tak ada perubahan: lanjut tanpa menyimpan ulang. Pratinjau admin tak punya
              // ringkasan "selesai" → tombol berhenti di project terakhir.
              !(readOnly && isLast) && (
                <button type="button" className="btn-teal" disabled={busy} onClick={onNext}>
                  {isLast ? t.finish : t.next}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

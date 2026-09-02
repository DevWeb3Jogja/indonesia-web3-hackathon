"use client";

import { useAppKit } from "@reown/appkit/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import { useWallet } from "@/lib/use-wallet";
import { projectId as wcProjectId } from "@/lib/web3";
import ConnectWalletButton from "./ConnectWalletButton";
import ProjectForm, { clearProjectDraft, type ProjectData } from "./ProjectForm";
import { Alert, ArrowUpRight, Panel } from "./ui";
import { WalletLoading } from "./WalletLoading";

type T = Dict["psubmit"];
type FormDict = Dict["form"];

interface Project {
  id: string;
  name: string;
  tagline: string | null;
  teamId: string | null;
  trackIds: string[];
  status: string;
  team: { name: string; memberAddresses: string[] } | null;
  contractAddress: string | null;
  network: string | null;
  problemStatement: string | null;
  solution: string | null;
  description: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  demoVideoUrl: string | null;
  logoUrl: string | null;
}
interface Mine {
  project: Project | null;
  hasTeam: boolean;
  teamName: string | null;
  canSubmit: boolean;
  profileComplete: boolean;
}

function toInitial(p: Project): ProjectData {
  return {
    name: p.name,
    tagline: p.tagline ?? "",
    tracks: p.trackIds,
    logoUrl: p.logoUrl ?? "",
    contractAddress: p.contractAddress ?? "",
    network: p.network ?? "bsc",
    problemStatement: p.problemStatement ?? "",
    solution: p.solution ?? "",
    description: p.description ?? "",
    githubUrl: p.githubUrl ?? "",
    demoUrl: p.demoUrl ?? "",
    demoVideoUrl: p.demoVideoUrl ?? "",
  };
}

export default function ProjectSubmit({
  locale,
  t,
  form,
}: {
  locale: string;
  t: T;
  form: FormDict;
}) {
  if (!wcProjectId) return <Gate t={t} />;
  return <Inner locale={locale} t={t} form={form} />;
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

/** Indikator langkah untuk alur submit (fokus, per-langkah). */
function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold transition ${
                active
                  ? "border-white bg-white text-black"
                  : done
                    ? "border-white/60 text-white"
                    : "border-white/20 text-white/40"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`text-sm font-medium ${
                active ? "text-white" : done ? "text-white/70" : "text-white/40"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={`hidden h-px w-8 sm:block ${done ? "bg-white/50" : "bg-white/15"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type View = "my" | "mode" | "team" | "form" | "edit";

function Inner({ locale, t, form }: { locale: string; t: T; form: FormDict }) {
  const { address, isConnected, connecting } = useWallet();
  const { open } = useAppKit();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "unauth" | "ready">("loading");
  const [mine, setMine] = useState<Mine | null>(null);
  const [view, setView] = useState<View>("mode");
  const [mode, setMode] = useState<"solo" | "team">("solo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await fetch("/api/projects/mine");
    if (res.status === 401) return setStatus("unauth");
    const data: Mine = await res.json();
    setMine(data);
    if (data.project) {
      // Sudah submit: buka form edit HANYA kalau diminta (?edit=1, dari tombol Edit
      // di /my). Klik "Submit" biasa → arahkan ke ringkasan /my, jangan langsung edit.
      const wantEdit =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("edit") === "1";
      if (!wantEdit) return router.replace(localePath(locale, "/my"));
      setView("edit");
    } else {
      // Sudah tergabung tim → wajib submit sebagai tim itu (opsi solo disembunyikan).
      if (data.hasTeam) setMode("team");
      setView("mode");
    }
    setStatus("ready");
  }, [router, locale]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: address = pemicu re-fetch saat ganti wallet
  useEffect(() => {
    load();
  }, [load, address]);

  useEffect(() => {
    const onSession = () => load();
    window.addEventListener("iw3h:session", onSession);
    return () => window.removeEventListener("iw3h:session", onSession);
  }, [load]);

  async function send(method: "POST" | "PUT", url: string, body: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.status === 401) {
      setStatus("unauth");
      return null;
    }
    if (res.status === 429) {
      setError(t.errorRate);
      return null;
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      // Sertakan field yang gagal (dari zod) supaya jelas yang mana bermasalah.
      const detail = json?.detail as Record<string, unknown> | undefined;
      const fields = detail && typeof detail === "object" ? Object.keys(detail) : [];
      const base = json?.error ?? t.errorGeneric;
      setError(fields.length ? `${base}: ${fields.join(", ")}` : base);
      return null;
    }
    return json;
  }

  if (connecting) return <WalletLoading label={t.loading} />;
  if (!isConnected || status === "unauth") {
    return <Gate t={t} onSignIn={isConnected ? () => open() : undefined} />;
  }
  if (status === "loading" || !mine) return <p className="text-sm text-ink/60">{t.loading}</p>;

  const errorBox = error && (
    <p className="flex items-center gap-2 text-sm text-red-600">
      <Alert />
      {error}
    </p>
  );

  // ---------- Edit (project sudah ada) ----------
  if (view === "edit" && mine.project) {
    const p = mine.project;
    return (
      <div className="max-w-3xl space-y-5">
        <Link
          href={localePath(locale, "/my")}
          className="inline-block text-sm text-teal hover:underline"
        >
          ← {t.cancelEdit}
        </Link>
        {errorBox}
        <ProjectForm
          form={form}
          initial={toInitial(p)}
          submitLabel={t.edit}
          savingLabel={form.saving}
          busy={busy}
          onSubmit={async (payload) => {
            const r = await send("PUT", `/api/projects/${p.id}`, payload);
            if (r) router.push(localePath(locale, "/my"));
          }}
        />
      </div>
    );
  }

  // ---------- Belum submit: pilih mode ----------
  if (!mine.canSubmit) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink/70">
        <Alert />
        {t.closed}
      </p>
    );
  }

  // ---------- Wajib lengkapi profil dulu ----------
  if (!mine.profileComplete) {
    return (
      <Panel clip="chamfer-lg" className="max-w-md">
        <div className="p-8">
          <h2 className="section-title">{t.profileRequiredTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{t.profileRequiredDesc}</p>
          <Link
            href={`${localePath(locale, "/profile")}?next=${encodeURIComponent(localePath(locale, "/submit"))}`}
            className="btn-teal mt-6"
          >
            {t.profileRequiredCta}
            <ArrowUpRight />
          </Link>
        </div>
      </Panel>
    );
  }

  // ---------- Alur submit (stepper) ----------
  const steps =
    mode === "team" && !mine.hasTeam
      ? [t.stepType, t.stepTeam, t.stepDetails]
      : [t.stepType, t.stepDetails];
  const currentStep = view === "team" ? 1 : view === "form" ? steps.length - 1 : 0;

  let content: ReactNode = null;
  if (view === "mode") {
    content = (
      <div className="max-w-xl space-y-6">
        <h2 className="section-title">{t.chooseTitle}</h2>
        {mine.hasTeam ? (
          // Sudah punya tim → kunci ke mode tim, tidak boleh pilih solo.
          <div className="chamfer-lg border border-teal/25 bg-white/[0.04] p-6">
            <span className="font-firs text-xl font-semibold">{t.teamLabel}</span>
            <span className="mt-2 block text-sm text-ink/60">
              {t.usingTeam}: {mine.teamName ?? "—"}
            </span>
            <Link
              href={localePath(locale, "/team")}
              className="mt-3 inline-block text-sm text-teal hover:underline"
            >
              {t.soloInstead}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["solo", "team"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`chamfer-lg p-6 text-left transition ${
                  mode === m
                    ? "bg-white text-black"
                    : "border border-teal/25 bg-white/[0.04] hover:bg-haze"
                }`}
              >
                <span className="font-firs text-xl font-semibold">
                  {m === "solo" ? t.soloLabel : t.teamLabel}
                </span>
                <span
                  className={`mt-2 block text-sm ${mode === m ? "text-black/60" : "text-ink/60"}`}
                >
                  {m === "solo" ? t.soloDesc : t.teamDesc}
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="btn-teal"
          onClick={() => setView(mode === "team" && !mine.hasTeam ? "team" : "form")}
        >
          {t.continue}
          <ArrowUpRight />
        </button>
      </div>
    );
  }

  // ---------- Langkah tim (kalau pilih Tim tapi belum punya tim) ----------
  if (view === "team") {
    content = (
      <div className="max-w-2xl space-y-6">
        <button
          type="button"
          className="text-sm text-teal hover:underline"
          onClick={() => setView("mode")}
        >
          ← {t.back}
        </button>
        <h2 className="section-title">{t.teamStepTitle}</h2>
        <p className="text-sm text-ink/70">{t.teamNone}</p>
        {errorBox}
        <div className="grid gap-6 md:grid-cols-2">
          <Panel clip="chamfer-lg">
            <form
              className="space-y-4 p-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await send("POST", "/api/teams", { name: teamName });
                if (r) {
                  await load();
                  setView("form");
                }
              }}
            >
              <h3 className="section-title text-[22px]">{t.createTeam}</h3>
              <input
                className="input-field"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={t.teamNamePlaceholder}
                minLength={2}
                maxLength={60}
                required
              />
              <button type="submit" className="btn-teal" disabled={busy}>
                {t.createTeam}
              </button>
            </form>
          </Panel>
          <Panel clip="chamfer-lg">
            <form
              className="space-y-4 p-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await send("POST", "/api/teams/join", { code: code.trim() });
                if (r) {
                  await load();
                  setView("form");
                }
              }}
            >
              <h3 className="section-title text-[22px]">{t.joinTeam}</h3>
              <input
                className="input-field font-mono uppercase tracking-[0.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t.codePlaceholder}
                maxLength={8}
                required
              />
              <button type="submit" className="btn-ink" disabled={busy}>
                {t.joinTeam}
              </button>
            </form>
          </Panel>
        </div>
      </div>
    );
  }

  // ---------- Form project (create) ----------
  if (view === "form") {
    content = (
      <div className="max-w-3xl space-y-5">
        <button
          type="button"
          className="text-sm text-teal hover:underline"
          onClick={() => setView("mode")}
        >
          ← {t.back}
        </button>
        <p className="text-sm text-ink/70">
          {mode === "team" ? `${t.usingTeam}: ${mine.teamName ?? "—"}` : t.soloLabel}
        </p>
        {errorBox}
        <ProjectForm
          form={form}
          submitLabel={t.submitCta}
          savingLabel={form.saving}
          busy={busy}
          onSubmit={async (payload) => {
            const r = await send("POST", "/api/projects", { mode, ...payload });
            if (r) {
              clearProjectDraft(); // draft tak perlu lagi setelah tersimpan di server
              // Setelah submit sukses → ke halaman My Projects yang menampilkan project.
              router.push(localePath(locale, "/my"));
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Stepper steps={steps} current={currentStep} />
      {content}
    </div>
  );
}

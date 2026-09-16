"use client";

import type { DemoDayProject, LeaderboardRow } from "@iw3h/db";
import { useAppKit } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getTurnstileToken } from "@/lib/turnstile";
import { useWallet } from "@/lib/use-wallet";
import { projectId } from "@/lib/web3";

interface Props {
  demo: boolean;
  signedIn: boolean;
  isAdmin: boolean;
  votingOpen: boolean;
  canAccess: boolean;
  canSeeLeaderboard: boolean;
  finalists: DemoDayProject[];
  myVote: string | null;
  leaderboard: LeaderboardRow[] | null;
}

const PILL =
  "inline-flex items-center justify-center rounded-full border-2 px-5 py-2.5 text-sm font-medium uppercase tracking-wider transition-colors";

export default function VoteApp(props: Props) {
  const router = useRouter();

  // SIWE sukses/keluar → siwe.ts kirim event; re-render server (cookie baru) supaya
  // role/myVote/akses ikut ter-update tanpa reload manual.
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("iw3h:session", refresh);
    return () => window.removeEventListener("iw3h:session", refresh);
  }, [router]);

  // Fade-in saat masuk viewport.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".fade-in"));
    if (!("IntersectionObserver" in window)) {
      for (const el of els) el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "40px", threshold: 0 }
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1100px] px-5 pb-24 sm:px-8">
      {props.demo ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand/50 bg-brand/10 px-4 py-3 text-sm text-brand">
          <span className="font-semibold uppercase tracking-wider">● Mode demo</span>
          <span className="text-brand/80">
            Finalis mock — vote & ranking terpisah dari edisi asli.
          </span>
          <a href="/" className="underline underline-offset-2 hover:opacity-80">
            keluar demo
          </a>
        </div>
      ) : null}
      <Header signedIn={props.signedIn} />
      {props.canAccess ? <VoteBoard {...props} /> : <ClosedGate signedIn={props.signedIn} />}
    </main>
  );
}

function Header({ signedIn }: { signedIn: boolean }) {
  const { open } = useAppKit();
  const { address, connecting } = useWallet();
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;
  return (
    <header className="flex items-center justify-between gap-4 py-6">
      {/** biome-ignore lint/performance/noImgElement: logo statis, tak perlu next/image */}
      <img src="/logo.png" alt="Indonesia Web3 Hackathon" className="h-8 w-auto sm:h-9" />
      {projectId ? (
        <button
          type="button"
          onClick={() => open()}
          className={`${PILL} border-mist/40 text-mist hover:bg-mist/10`}
        >
          {connecting ? "…" : short ? short : signedIn ? "Akun" : "Sign in"}
        </button>
      ) : null}
    </header>
  );
}

function ClosedGate({ signedIn }: { signedIn: boolean }) {
  const { open } = useAppKit();
  return (
    <section className="flex flex-col items-center gap-6 py-24 text-center fade-in">
      <h1 className="hero-heading text-[clamp(3rem,16vw,9rem)] font-black uppercase leading-none tracking-tight">
        Vote
      </h1>
      <p className="max-w-md text-balance text-lg text-mist/70">
        Voting demo day belum dibuka. Halaman ini terbuka untuk peserta & juri saat sesi demo day
        berlangsung.
      </p>
      {projectId && !signedIn ? (
        <button
          type="button"
          onClick={() => open()}
          className={`${PILL} border-brand bg-brand text-ink hover:opacity-90`}
        >
          Sign in
        </button>
      ) : null}
    </section>
  );
}

function VoteBoard({
  demo,
  signedIn,
  votingOpen,
  canSeeLeaderboard,
  finalists,
  myVote: initialVote,
  leaderboard: initialLb,
}: Props) {
  const { open } = useAppKit();
  const [myVote, setMyVote] = useState(initialVote);
  const [leaderboard, setLeaderboard] = useState(initialLb);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState(false);

  const refetchLeaderboard = useCallback(async () => {
    if (!canSeeLeaderboard) return;
    const res = await fetch(`/api/leaderboard${demo ? "?demo=1" : ""}`);
    if (res.ok) setLeaderboard((await res.json()).rows);
  }, [canSeeLeaderboard, demo]);

  async function vote(id: string) {
    setError(null);
    if (!signedIn) {
      open();
      return;
    }
    setBusy(id);
    try {
      const token = await getTurnstileToken();
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { "x-turnstile-token": token } : {}),
        },
        body: JSON.stringify({ projectId: id, ...(demo ? { demo: true } : {}) }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? "Gagal menyimpan vote");
        return;
      }
      setMyVote(id);
      setJustVoted(true);
      await refetchLeaderboard();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="flex flex-col items-center gap-3 py-10 text-center sm:py-16 fade-in">
        <h1 className="hero-heading text-[clamp(3rem,16vw,9rem)] font-black uppercase leading-none tracking-tight">
          Vote
        </h1>
        <p className="max-w-md text-balance text-mist/70">
          {votingOpen
            ? "Pilih satu project favoritmu. Kamu bisa mengubah pilihan selama voting dibuka."
            : "Voting sedang ditutup — kamu melihat halaman ini sebagai admin."}
        </p>
      </section>

      {error ? (
        <p className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {justVoted && !canSeeLeaderboard ? (
        <p className="mb-6 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-center text-sm text-brand">
          Vote kamu tercatat. Hasil akan diumumkan panitia.
        </p>
      ) : null}

      {finalists.length === 0 ? (
        <p className="py-10 text-center text-mist/50">Belum ada finalis demo day.</p>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          {finalists.map((p, i) => (
            <FinalistCard
              key={p.id}
              n={i + 1}
              project={p}
              selected={myVote === p.id}
              busy={busy === p.id}
              disabled={!votingOpen || busy !== null}
              onVote={() => vote(p.id)}
            />
          ))}
        </div>
      )}

      {leaderboard ? <Leaderboard rows={leaderboard} myVote={myVote} /> : null}
    </>
  );
}

function FinalistCard({
  n,
  project,
  selected,
  busy,
  disabled,
  onVote,
}: {
  n: number;
  project: DemoDayProject;
  selected: boolean;
  busy: boolean;
  disabled: boolean;
  onVote: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-[28px] border-2 border-mist/25 bg-ink p-4 sm:gap-6 sm:rounded-[44px] sm:p-6 fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <span className="font-black tabular-nums text-mist/30 text-[2.5rem] leading-none sm:text-[4.5rem]">
            {String(n).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wider text-brand sm:text-sm">
              {project.tagline || "Finalist"}
            </p>
            <h3 className="truncate text-lg font-light sm:text-2xl">{project.name}</h3>
          </div>
        </div>
        {selected ? (
          <span className="hidden shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-semibold uppercase text-ink sm:inline">
            Pilihanmu
          </span>
        ) : null}
      </div>

      <Logo project={project} />

      <div className="flex flex-wrap items-center gap-2">
        {project.demoUrl ? (
          <a
            href={project.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${PILL} border-mist/40 text-mist hover:bg-mist/10`}
          >
            Live ↗
          </a>
        ) : null}
        {project.githubUrl ? (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${PILL} border-mist/40 text-mist hover:bg-mist/10`}
          >
            GitHub ↗
          </a>
        ) : null}
        <button
          type="button"
          onClick={onVote}
          disabled={disabled}
          className={`${PILL} ml-auto min-w-[120px] disabled:cursor-not-allowed disabled:opacity-40 ${
            selected
              ? "border-brand bg-brand text-ink"
              : "border-mist bg-transparent text-mist hover:bg-mist/10"
          }`}
        >
          {busy ? "…" : selected ? "Terpilih ✓" : "Vote"}
        </button>
      </div>
    </article>
  );
}

function Logo({ project }: { project: DemoDayProject }) {
  if (project.logoUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: logo dari R2/eksternal, ukuran kecil
      <img
        src={project.logoUrl}
        alt={project.name}
        className="h-36 w-full rounded-2xl border border-mist/10 bg-white/5 object-contain sm:h-52"
      />
    );
  }
  const initials = project.name.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-36 w-full items-center justify-center rounded-2xl border border-mist/10 bg-white/5 text-4xl font-black text-mist/40 sm:h-52">
      {initials}
    </div>
  );
}

function Leaderboard({ rows, myVote }: { rows: LeaderboardRow[]; myVote: string | null }) {
  const max = Math.max(1, ...rows.map((r) => r.votes));
  const total = rows.reduce((s, r) => s + r.votes, 0);
  return (
    <section className="mt-14 fade-in">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Leaderboard</h2>
        <span className="text-sm text-mist/50">{total} vote</span>
      </div>
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={`rounded-2xl border p-4 ${
              i === 0 ? "border-brand/50 bg-brand/5" : "border-mist/15 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`w-6 shrink-0 text-center font-black tabular-nums ${
                    i === 0 ? "text-brand" : "text-mist/40"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="truncate font-medium">
                  {r.name}
                  {myVote === r.id ? (
                    <span className="ml-2 text-xs text-brand">• pilihanmu</span>
                  ) : null}
                </span>
              </div>
              <span className="shrink-0 font-black tabular-nums">{r.votes}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mist/10">
              <div
                className={i === 0 ? "h-full bg-brand" : "h-full bg-mist/40"}
                style={{ width: `${(r.votes / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

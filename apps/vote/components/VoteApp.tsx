"use client";

import type { DemoDayProject } from "@iw3h/db";
import { useAppKit } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getTurnstileToken } from "@/lib/turnstile";
import { useWallet } from "@/lib/use-wallet";
import { projectId } from "@/lib/web3";

interface Props {
  demo: boolean;
  signedIn: boolean;
  isAdmin: boolean;
  votingOpen: boolean;
  canAccess: boolean;
  /** Voting sudah ditutup (bukan belum dibuka) → gate menampilkan pesan penutup. */
  votingClosed?: boolean;
  /** Urut presentasi (server). */
  finalists: DemoDayProject[];
  myVote: string | null;
  /** Finalis milik wallet ini → tombol vote-nya dimatikan (server tetap menolak). */
  ownIds: string[];
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
      {props.canAccess ? (
        <VoteBoard {...props} />
      ) : (
        <ClosedGate signedIn={props.signedIn} closed={props.votingClosed ?? false} />
      )}
    </main>
  );
}

function Header({ signedIn }: { signedIn: boolean }) {
  const { open } = useAppKit();
  const { address, connecting } = useWallet();
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;
  return (
    <header className="flex items-center justify-between gap-4 py-6">
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

function ClosedGate({ signedIn, closed }: { signedIn: boolean; closed: boolean }) {
  const { open } = useAppKit();
  return (
    <section className="flex flex-col items-center gap-6 py-24 text-center fade-in">
      <h1 className="hero-heading text-[clamp(3rem,16vw,9rem)] font-black uppercase leading-none tracking-tight">
        Vote
      </h1>
      <p className="max-w-md text-balance text-lg text-mist/70">
        {closed
          ? "Voting Community Choice sudah ditutup. Terima kasih sudah ikut memilih — pemenang diumumkan di panggung."
          : "Voting Community Choice belum dibuka. Halaman ini terbuka setelah semua finalis selesai demo — sign in dulu supaya nanti tinggal pilih."}
      </p>
      {projectId && !signedIn && !closed ? (
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

function VoteBoard({ demo, signedIn, votingOpen, finalists, myVote: initialVote, ownIds }: Props) {
  const { open } = useAppKit();
  const router = useRouter();
  const [myVote, setMyVote] = useState(initialVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<DemoDayProject | null>(null);

  // Server bisa membawa pilihan yang lebih baru (mis. vote dari tab lain → refresh).
  useEffect(() => setMyVote(initialVote), [initialVote]);

  function ask(p: DemoDayProject) {
    setError(null);
    if (!signedIn) {
      open();
      return;
    }
    setConfirming(p);
  }

  async function vote(id: string) {
    setBusy(true);
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
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Gagal menyimpan vote");
        // Sudah pernah memilih (mis. dari HP/tab lain) → ambil pilihan aslinya dari server.
        if (body?.code === "already_voted") router.refresh();
        return;
      }
      setMyVote(id);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  const picked = myVote ? finalists.find((p) => p.id === myVote) : undefined;
  const locked = myVote !== null;

  return (
    <>
      <section className="flex flex-col items-center gap-3 py-10 text-center sm:py-16 fade-in">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand sm:text-sm">
          Community Choice
        </p>
        <h1 className="hero-heading text-[clamp(3rem,16vw,9rem)] font-black uppercase leading-none tracking-tight">
          Vote
        </h1>
        <p className="max-w-md text-balance text-mist/70">
          {votingOpen
            ? "Pilih satu finalis favoritmu. Satu orang satu suara, dan pilihan tidak bisa diganti."
            : "Voting sedang ditutup — kamu melihat halaman ini sebagai admin."}
        </p>
      </section>

      {locked ? (
        <p
          role="status"
          className="mb-6 rounded-2xl border border-brand/50 bg-brand/10 px-4 py-4 text-center text-brand"
        >
          Suaramu untuk <strong className="font-semibold">{picked?.name ?? "pilihanmu"}</strong>{" "}
          sudah tercatat. Terima kasih!
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}

      {finalists.length === 0 ? (
        <p className="py-10 text-center text-mist/50">Belum ada finalis demo day.</p>
      ) : (
        // Daftar ringkas: 10 finalis hampir muat satu layar HP; 2 kolom di layar lebar.
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {finalists.map((p) => (
            <FinalistCard
              key={p.id}
              project={p}
              selected={myVote === p.id}
              own={ownIds.includes(p.id)}
              disabled={!votingOpen || locked || busy}
              onVote={() => ask(p)}
            />
          ))}
        </div>
      )}

      {confirming ? (
        <ConfirmVote
          project={confirming}
          busy={busy}
          onCancel={() => (busy ? undefined : setConfirming(null))}
          onConfirm={() => vote(confirming.id)}
        />
      ) : null}
    </>
  );
}

/** Konfirmasi sebelum POST — vote tak bisa diganti, jadi satu ketukan salah = fatal. */
function ConfirmVote({
  project,
  busy,
  onCancel,
  onConfirm,
}: {
  project: DemoDayProject;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-vote-title"
        className="w-full max-w-md rounded-[28px] border-2 border-mist/25 bg-ink p-6"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          No. {String(project.position).padStart(2, "0")}
        </p>
        <h2 id="confirm-vote-title" className="mt-2 text-2xl font-light text-balance">
          Pilih <span className="font-semibold">{project.name}</span>?
        </h2>
        <p className="mt-2 text-mist/70">Pilihanmu tidak bisa diganti.</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`${PILL} flex-1 border-mist/40 text-mist hover:bg-mist/10 disabled:opacity-40`}
          >
            Batal
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${PILL} flex-1 border-brand bg-brand text-ink hover:opacity-90 disabled:opacity-60`}
          >
            {busy ? "Menyimpan…" : "Ya, pilih"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FinalistCard({
  project,
  selected,
  own,
  disabled,
  onVote,
}: {
  project: DemoDayProject;
  selected: boolean;
  own: boolean;
  disabled: boolean;
  onVote: () => void;
}) {
  const links = [
    { href: project.demoUrl, label: "Live" },
    { href: project.githubUrl, label: "GitHub" },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));
  return (
    <article
      className={`flex min-w-0 items-center gap-3 rounded-2xl border-2 bg-ink p-3 sm:gap-4 sm:p-4 fade-in ${
        selected ? "border-brand" : "border-mist/20"
      }`}
    >
      <span className="w-7 shrink-0 text-center text-sm font-black tabular-nums text-brand/80">
        {String(project.position).padStart(2, "0")}
      </span>
      <Logo project={project} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-medium sm:text-lg">{project.name}</h3>
        {project.tagline ? (
          <p className="truncate text-xs text-mist/55 sm:text-sm">{project.tagline}</p>
        ) : null}
        {links.length || own ? (
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-mist/60 underline-offset-2 hover:text-mist hover:underline"
              >
                {l.label} ↗
              </a>
            ))}
            {own && !selected ? <span className="text-mist/45">Project timmu</span> : null}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onVote}
        disabled={disabled || own}
        aria-label={`${selected ? "Terpilih" : "Vote"} ${project.name}`}
        className={`shrink-0 rounded-full border-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed sm:px-5 ${
          selected
            ? "border-brand bg-brand text-ink"
            : "border-mist text-mist hover:bg-mist/10 disabled:opacity-40"
        }`}
      >
        {selected ? "Terpilih ✓" : "Vote"}
      </button>
    </article>
  );
}

/** Logo persegi kecil (daftar ringkas). Tanpa logo → inisial. */
function Logo({ project }: { project: DemoDayProject }) {
  const box = "h-14 w-14 shrink-0 rounded-xl border border-mist/10 bg-white/5 sm:h-16 sm:w-16";
  if (project.logoUrl) {
    return <img src={project.logoUrl} alt="" className={`${box} object-contain`} />;
  }
  return (
    <div className={`${box} flex items-center justify-center text-lg font-black text-mist/40`}>
      {project.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

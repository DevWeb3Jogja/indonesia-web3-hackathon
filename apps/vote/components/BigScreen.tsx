"use client";

import type { ScreenFinalist, VoteScreen } from "@iw3h/db";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 2000;

interface Props {
  demo: boolean;
  initial: VoteScreen;
  /** QR (data-URI SVG) dari server. */
  qrSrc: string;
  /** URL tanpa skema untuk ditampilkan besar di bawah QR. */
  urlText: string;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Layar besar Community Choice. Satu panggung 1920×1080 yang diskalakan ke viewport
 * lewat unit --u (lihat app/screen/screen.css) → tata letak identik di 1080p/720p.
 * Data: polling /api/screen tiap 2 detik selama tab terlihat; gagal jaringan → data
 * terakhir tetap tampil (layar tak boleh kosong di depan 300 orang).
 * Animasi (hanya tiga, semua mati di prefers-reduced-motion):
 *  1. tile finalis masuk berurutan saat halaman/state muncul,
 *  2. angka total bergulir dari nilai lama ke baru,
 *  3. satu riak emas dari angka total tiap polling yang membawa suara baru.
 */
export default function BigScreen({ demo, initial, qrSrc, urlText }: Props) {
  const { data, authLost } = usePolledScreen(initial, demo);
  const { state, total, finalists } = data;

  return (
    <main className="screen-root" aria-live="off">
      <div className="screen-stage">
        <section className="screen-left">
          <header className="screen-top">
            <img src="/logo.png" alt="Indonesia Web3 Hackathon" className="screen-logo" />
            <span className="screen-kicker">
              Demo Day · Indonesia Web3 Hackathon 2026
              {demo ? <span className="screen-demo"> — mode demo (gladi)</span> : null}
            </span>
          </header>

          <h1 className="hero-heading screen-title">Community Choice</h1>
          <p className="screen-sub">
            {state === "open"
              ? "Scan, sign in, lalu pilih satu finalis favoritmu."
              : state === "closed"
                ? "Terima kasih sudah memilih."
                : `${finalists.length || 10} finalis · satu suara per orang`}
          </p>

          {/* key=state → grid dipasang ulang saat state berganti → entrance diputar lagi. */}
          <FinalistGrid key={state} finalists={finalists} />
        </section>

        <aside className="screen-right">
          {state === "open" ? (
            <>
              <div className="screen-qr">
                <img src={qrSrc} alt={`QR ke ${urlText}`} />
              </div>
              <p
                className="screen-url"
                style={{ fontSize: `calc(var(--u) * ${urlSize(urlText)})` }}
              >
                {urlText}
              </p>
              <Steps />
            </>
          ) : state === "closed" ? (
            <div className="screen-closed">
              <p className="screen-closed-title">Voting ditutup</p>
              <p className="screen-closed-sub">Pemenang diumumkan di panggung</p>
            </div>
          ) : (
            <div className="screen-wait">
              <span className="screen-wait-kicker">Segera</span>
              <p>Voting dibuka setelah demo terakhir</p>
              <Steps />
            </div>
          )}

          {state === "waiting" ? null : <Counter total={total} />}
        </aside>
      </div>
      {/* Untuk operator: sesi admin di laptop videotron habis → layar tak lagi update. */}
      {authLost ? (
        <p className="screen-authlost" role="status">
          Sesi admin habis — layar tidak update. Login ulang di laptop ini.
        </p>
      ) : null}
    </main>
  );
}

/** Polling data layar. Jeda saat tab tersembunyi, langsung ambil lagi saat terlihat. */
function usePolledScreen(
  initial: VoteScreen,
  demo: boolean
): { data: VoteScreen; authLost: boolean } {
  const [data, setData] = useState(initial);
  const [authLost, setAuthLost] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ctrl: AbortController | null = null;
    let stopped = false;
    const url = `/api/screen${demo ? "?demo=1" : ""}`;

    const tick = async () => {
      ctrl = new AbortController();
      const kill = setTimeout(() => ctrl?.abort(), POLL_MS * 2);
      try {
        const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
        // Data terakhir tetap tampil kalau gagal; 401/403 = sesi admin habis → beri tanda.
        if (res.ok) {
          setData((await res.json()) as VoteScreen);
          setAuthLost(false);
        } else if (res.status === 401 || res.status === 403) {
          setAuthLost(true);
        }
      } catch {
        // Jaringan venue putus sebentar → diam saja, coba lagi di putaran berikut.
      } finally {
        clearTimeout(kill);
      }
      if (!stopped && document.visibilityState === "visible") {
        timer = setTimeout(tick, POLL_MS);
      }
    };

    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      ctrl?.abort();
      if (document.visibilityState === "visible") void tick();
    };

    timer = setTimeout(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      ctrl?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [demo]);

  return { data, authLost };
}

/** Panduan singkat — di layar "menunggu" penonton sudah tahu caranya sebelum QR muncul. */
const STEPS = ["Scan QR", "Sign in wallet", "Pilih 1 finalis"];
function Steps() {
  return (
    <ol className="screen-steps">
      {STEPS.map((label, i) => (
        <li key={label}>
          <span className="screen-step-num">{String(i + 1).padStart(2, "0")}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function FinalistGrid({ finalists }: { finalists: ScreenFinalist[] }) {
  if (finalists.length === 0) {
    return <p className="screen-empty">Finalis belum ditetapkan.</p>;
  }
  return (
    <ol className="screen-grid">
      {finalists.map((f, i) => (
        <li key={f.id} className="screen-tile" style={{ animationDelay: `${120 + i * 70}ms` }}>
          <span className="screen-num">{String(f.position).padStart(2, "0")}</span>
          <TileLogo f={f} />
          <span className="screen-name">{f.name}</span>
        </li>
      ))}
    </ol>
  );
}

function TileLogo({ f }: { f: ScreenFinalist }) {
  const [broken, setBroken] = useState(false);
  if (f.logoUrl && !broken) {
    return (
      <img src={f.logoUrl} alt="" className="screen-tile-logo" onError={() => setBroken(true)} />
    );
  }
  return <span className="screen-tile-logo screen-initials">{initials(f.name)}</span>;
}

/** Ukuran teks URL (unit kanvas) supaya muat selebar kartu QR (520u). ~0.6em per
 *  karakter untuk Kanit semibold; dibatasi 40u supaya URL pendek tak kebesaran. */
function urlSize(text: string): number {
  return Math.min(40, Math.floor(520 / (text.length * 0.6)));
}

/** Inisial dua kata pertama yang diawali huruf/angka ("Demo — Garuda ID" → "DG");
 *  satu kata → dua huruf pertamanya ("RantauChain" → "RA"). */
function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  const out = words.length === 1 ? words[0].slice(0, 2) : words.map((w) => w[0]).join("");
  return out.slice(0, 2).toUpperCase() || "?";
}

/** Angka total: bergulir dari nilai lama ke baru + satu riak emas tiap kali naik. */
function Counter({ total }: { total: number }) {
  const shown = useRolling(total);
  const [ripples, setRipples] = useState<number[]>([]);
  const prev = useRef(total);

  useEffect(() => {
    const before = prev.current;
    prev.current = total;
    if (total <= before || reducedMotion()) return;
    const id = Date.now();
    setRipples((r) => [...r.slice(-2), id]); // maks 3 riak di DOM sekaligus
    const t = setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 1800);
    return () => clearTimeout(t);
  }, [total]);

  return (
    <div className="screen-counter">
      <div className="screen-count-wrap">
        {ripples.map((id) => (
          <span key={id} className="screen-ripple" aria-hidden />
        ))}
        <span className="screen-count">{shown.toLocaleString("id-ID")}</span>
      </div>
      <span className="screen-count-label">suara masuk</span>
    </div>
  );
}

/** Tween angka (easeOutCubic ~0.9 dtk). Reduced motion → langsung lompat. */
function useRolling(target: number): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = from.current;
    if (start === target || reducedMotion()) {
      from.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    const dur = 900;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - (1 - p) ** 3;
      const v = Math.round(start + (target - start) * eased);
      from.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return value;
}

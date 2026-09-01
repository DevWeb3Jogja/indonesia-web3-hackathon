"use client";

import { useAppKit } from "@reown/appkit/react";
import { useCallback, useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { useWallet } from "@/lib/use-wallet";
import { projectId } from "@/lib/web3";
import ConnectWalletButton from "./ConnectWalletButton";
import { GeneratedAvatar } from "./GeneratedAvatar";
import { Alert, Panel } from "./ui";
import { WalletLoading } from "./WalletLoading";

type T = Dict["team"];

interface Member {
  address: string;
  role: string;
  joinedAt: string;
  username?: string | null;
  githubUrl?: string | null;
}
interface Team {
  id: string;
  name: string;
  inviteCode: string;
  leaderAddress: string;
  members: Member[];
}
interface Data {
  team: Team | null;
  hackathon: { id: string; name: string; status: string } | null;
  canManage: boolean;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function TeamPanel({ t }: { t: T }) {
  if (!projectId) {
    return <Gate t={t} />;
  }
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
  const { isConnected, address, connecting } = useWallet();
  const { open } = useAppKit();

  const [status, setStatus] = useState<"loading" | "unauth" | "ready">("loading");
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await fetch("/api/teams");
    if (res.status === 401) return setStatus("unauth");
    setData(await res.json());
    setStatus("ready");
  }, []);

  // Re-load saat mount, saat wallet berganti, dan saat sesi berubah (SIWE
  // onSignIn/onSignOut) — supaya gate "sign in" hilang setelah sign, tanpa refresh.
  // biome-ignore lint/correctness/useExhaustiveDependencies: address = pemicu re-fetch saat ganti wallet
  useEffect(() => {
    load();
  }, [load, address]);

  useEffect(() => {
    const onSession = () => load();
    window.addEventListener("iw3h:session", onSession);
    return () => window.removeEventListener("iw3h:session", onSession);
  }, [load]);

  async function act(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    setBusy(false);
    if (res.ok) {
      await load();
      return true;
    }
    if (res.status === 401) {
      setStatus("unauth");
    } else if (res.status === 429) {
      setError(t.errorRate);
    } else {
      const j = await res.json().catch(() => null);
      setError(j?.error ?? t.errorGeneric);
    }
    return false;
  }

  if (connecting) return <WalletLoading />;
  if (!isConnected || status === "unauth") {
    return <Gate t={t} onSignIn={isConnected ? () => open() : undefined} />;
  }
  if (status === "loading") return <p className="text-sm text-ink/60">{t.loading}</p>;

  const errorBox = error && (
    <p className="flex items-center gap-2 text-sm text-red-600">
      <Alert />
      {error}
    </p>
  );

  // Sudah punya tim.
  if (data?.team) {
    const team = data.team;
    const isLeader = team.leaderAddress.toLowerCase() === address?.toLowerCase();
    return (
      <div className="max-w-2xl space-y-6">
        <Panel clip="chamfer-lg" tone="bg-white/[0.02]">
          <div className="p-6">
            <p className="eyebrow">{t.myTeamTitle}</p>
            <h2 className="section-title mt-1">{team.name}</h2>

            <div className="mt-5">
              <p className="label-field">{t.inviteLabel}</p>
              <div className="flex items-center gap-3">
                <code className="chamfer-sm bg-haze px-3 py-2 font-mono text-lg tracking-[0.3em] text-ink">
                  {team.inviteCode}
                </code>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={async () => {
                    // clipboard bisa gagal (konteks non-HTTPS/izin ditolak) → jangan
                    // tampilkan "tersalin" kalau gagal, dan jangan lempar unhandled.
                    try {
                      await navigator.clipboard?.writeText(team.inviteCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    } catch {
                      /* diamkan; user bisa salin manual */
                    }
                  }}
                >
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-ink/50">{t.inviteHint}</p>
            </div>

            <div className="mt-6">
              <p className="label-field">
                {t.membersLabel} ({team.members.length}/5)
              </p>
              <ul className="mt-2 space-y-2">
                {team.members.map((m) => {
                  const you = m.address.toLowerCase() === address?.toLowerCase();
                  const handle = m.githubUrl?.match(/github\.com\/([^/?#]+)/i)?.[1] ?? null;
                  const name = m.username || handle || short(m.address);
                  return (
                    <li
                      key={m.address}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      <span className="inline-flex size-10 shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-white/10">
                        {handle ? (
                          <img
                            src={`https://github.com/${handle}.png?size=80`}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <GeneratedAvatar name={m.address} size={40} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{name}</p>
                        {m.username && (
                          <p className="truncate font-mono text-[11px] text-ink/40">
                            {short(m.address)}
                          </p>
                        )}
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        {you && <span className="tag">{t.youBadge}</span>}
                        <span className="tag">
                          {m.role === "leader" ? t.leaderBadge : t.memberBadge}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Panel>

        {errorBox}

        <div className="flex flex-col gap-2">
          {isLeader && team.members.length > 1 && (
            <p className="text-[11px] text-ink/50">{t.leaveLeaderNote}</p>
          )}
          <button
            type="button"
            className="btn-outline self-start"
            disabled={busy}
            onClick={() => act("/api/teams/leave")}
          >
            {t.leaveCta}
          </button>
        </div>
      </div>
    );
  }

  // Belum punya tim → buat / gabung.
  const closed = data && !data.canManage;
  return (
    <div className="max-w-2xl space-y-6">
      {closed && (
        <p className="flex items-center gap-2 text-sm text-ink/70">
          <Alert />
          {t.closed}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel clip="chamfer-lg" tone="bg-white/[0.02]">
          <form
            className="space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              act("/api/teams", { name });
            }}
          >
            <h3 className="section-title text-[24px]">{t.createTitle}</h3>
            <div>
              <label className="label-field" htmlFor="team-name">
                {t.nameLabel}
              </label>
              <input
                id="team-name"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                minLength={2}
                maxLength={60}
                required
                disabled={closed || busy}
              />
            </div>
            <button type="submit" className="btn-teal" disabled={closed || busy}>
              {t.createCta}
            </button>
          </form>
        </Panel>

        <Panel clip="chamfer-lg" tone="bg-white/[0.02]">
          <form
            className="space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              act("/api/teams/join", { code: code.trim() });
            }}
          >
            <h3 className="section-title text-[24px]">{t.joinTitle}</h3>
            <div>
              <label className="label-field" htmlFor="team-code">
                {t.codeLabel}
              </label>
              <input
                id="team-code"
                className="input-field font-mono uppercase tracking-[0.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t.codePlaceholder}
                maxLength={8}
                required
                disabled={closed || busy}
              />
            </div>
            <button type="submit" className="btn-ink" disabled={closed || busy}>
              {t.joinCta}
            </button>
          </form>
        </Panel>
      </div>
      {errorBox}
    </div>
  );
}

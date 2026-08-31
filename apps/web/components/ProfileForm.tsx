"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { projectId } from "@/lib/web3";
import ConnectWalletButton from "./ConnectWalletButton";
import { GeneratedAvatar } from "./GeneratedAvatar";
import { Alert, Panel } from "./ui";

type T = Dict["profile"];

interface Profile {
  address: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  githubUrl: string | null;
  githubLogin: string | null;
  twitterUrl: string | null;
  role: string;
}

function GithubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const EMPTY = {
  username: "",
  email: "",
  bio: "",
  twitterUrl: "",
};
type FormState = typeof EMPTY;

// Validasi format (selaras dengan skema server).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const X_RE = /^https:\/\/(x|twitter)\.com\/.+/i;

/** "" → null supaya lolos skema server (field opsional, bukan string kosong). */
function toPayload(f: FormState) {
  return Object.fromEntries(
    Object.entries(f).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()])
  );
}

/**
 * Guard projectId SEBELUM memanggil hook AppKit — tanpa project ID createAppKit
 * tidak diinisialisasi (Web3Provider), jadi useAppKit() akan throw. Penting saat
 * prerender SSG di CI yang env-nya kosong.
 */
export default function ProfileForm({ t }: { t: T }) {
  if (!projectId) {
    return (
      <Panel className="mx-auto max-w-md" clip="chamfer-lg">
        <div className="p-8 text-center">
          <h2 className="section-title">{t.signInTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{t.signInDesc}</p>
        </div>
      </Panel>
    );
  }
  return <Inner t={t} />;
}

function Inner({ t }: { t: T }) {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState<"idle" | "loading" | "unauth">("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [uCheck, setUCheck] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await fetch("/api/profile");
    if (res.status === 401) {
      setStatus("unauth");
      return;
    }
    const data: Profile | null = await res.json().catch(() => null);
    if (data) {
      setProfile(data);
      setForm({
        username: data.username ?? "",
        email: data.email ?? "",
        bio: data.bio ?? "",
        twitterUrl: data.twitterUrl ?? "",
      });
    }
    setStatus("idle");
  }, []);

  // Muat ulang saat mount, saat wallet berganti (address), dan saat sesi
  // berubah (event dari siweConfig onSignIn/onSignOut) — bukan hanya sekali.
  // biome-ignore lint/correctness/useExhaustiveDependencies: address = pemicu re-fetch saat ganti wallet
  useEffect(() => {
    load();
  }, [load, address]);

  useEffect(() => {
    const onSession = () => load();
    window.addEventListener("iw3h:session", onSession);
    return () => window.removeEventListener("iw3h:session", onSession);
  }, [load]);

  // Hasil OAuth GitHub (?github=ok|taken|error|unconfigured) → pesan, lalu
  // bersihkan query dari URL biar tidak muncul lagi saat refresh.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("github");
    if (!p) return;
    const msg: Record<string, { kind: "ok" | "err"; text: string }> = {
      ok: { kind: "ok", text: t.githubLinked },
      taken: { kind: "err", text: t.githubTaken },
      error: { kind: "err", text: t.githubError },
      unconfigured: { kind: "err", text: t.githubError },
    };
    if (msg[p]) setMessage(msg[p]);
    window.history.replaceState({}, "", window.location.pathname);
  }, [t]);

  async function disconnectGithub() {
    if (!confirm(t.githubDisconnectConfirm)) return;
    await fetch("/api/auth/github/disconnect", { method: "POST" });
    load();
  }

  const set =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // Error format inline (hanya kalau field diisi).
  const emailErr = form.email.trim() !== "" && !EMAIL_RE.test(form.email.trim());
  const xErr = form.twitterUrl.trim() !== "" && !X_RE.test(form.twitterUrl.trim());

  // Cek ketersediaan username live (debounce) saat berbeda dari yang tersimpan.
  useEffect(() => {
    const u = form.username.trim();
    if (!u || u === (profile?.username ?? "")) {
      setUCheck("idle");
      return;
    }
    if (u.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(u)) {
      setUCheck("invalid");
      return;
    }
    setUCheck("checking");
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/username-check?u=${encodeURIComponent(u)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setUCheck(data.invalid ? "invalid" : data.available ? "ok" : "taken");
      } catch {
        /* dibatalkan */
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [form.username, profile?.username]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPayload(form)),
    });
    setSaving(false);
    if (res.ok) {
      setProfile(await res.json());
      setMessage({ kind: "ok", text: t.saved });
      // Datang dari alur submit ("lengkapi profil dulu") → balik ke sana, jangan
      // biarkan user nyasar di /profile. Hanya path internal (anti open-redirect).
      const next = new URLSearchParams(window.location.search).get("next");
      if (next?.startsWith("/") && !next.startsWith("//")) router.push(next);
    } else if (res.status === 400) {
      setMessage({ kind: "err", text: t.errorValidation });
    } else if (res.status === 429) {
      setMessage({ kind: "err", text: t.errorRate });
    } else if (res.status === 409) {
      setUCheck("taken");
      setMessage({ kind: "err", text: "Username sudah dipakai" });
    } else if (res.status === 401) {
      setStatus("unauth");
    } else {
      setMessage({ kind: "err", text: t.errorGeneric });
    }
  }

  // Belum connect / SIWE belum jalan → gerbang sign-in.
  if (!isConnected || status === "unauth") {
    return (
      <Panel className="mx-auto max-w-md" clip="chamfer-lg">
        <div className="p-8 text-center">
          <h2 className="section-title">{t.signInTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{t.signInDesc}</p>
          <div className="mt-6 flex justify-center">
            {isConnected ? (
              <button type="button" className="btn-teal" onClick={() => open()}>
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

  if (status === "loading") {
    return <p className="text-sm text-ink/60">{t.loading}</p>;
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-teal/15 py-4">
        {profile?.address && (
          <GeneratedAvatar name={profile.address} size={48} className="chamfer-sm !rounded-lg" />
        )}
        <div>
          <p className="label-field">{t.walletLabel}</p>
          <p className="font-mono text-sm text-ink">{profile?.address}</p>
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="username">
          {t.usernameLabel}
        </label>
        <input
          id="username"
          className="input-field"
          value={form.username}
          onChange={set("username")}
          placeholder={t.usernamePlaceholder}
          minLength={3}
          maxLength={32}
          required
        />
        {uCheck === "idle" ? (
          <p className="mt-1 text-[11px] text-ink/50">{t.usernameHint}</p>
        ) : (
          <p
            className={`mt-1 text-[11px] ${
              uCheck === "ok" ? "text-teal" : uCheck === "checking" ? "text-ink/50" : "text-red-500"
            }`}
          >
            {uCheck === "checking"
              ? "Mengecek ketersediaan…"
              : uCheck === "ok"
                ? "✓ Username tersedia"
                : uCheck === "taken"
                  ? "Username sudah dipakai"
                  : "Format username tidak valid"}
          </p>
        )}
      </div>

      <div>
        <label className="label-field" htmlFor="email">
          {t.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          className="input-field"
          value={form.email}
          onChange={set("email")}
          placeholder={t.emailPlaceholder}
          required
        />
        {emailErr && <p className="mt-1 text-[11px] text-red-500">Format email tidak valid</p>}
      </div>

      <div>
        <label className="label-field" htmlFor="bio">
          {t.bioLabel}
        </label>
        <textarea
          id="bio"
          className="input-field min-h-24"
          value={form.bio}
          onChange={set("bio")}
          placeholder={t.bioPlaceholder}
          maxLength={500}
        />
      </div>

      <div>
        <span className="label-field">{t.githubLabel}</span>
        {profile?.githubLogin ? (
          <div className="flex items-center gap-3">
            <a
              href={`https://github.com/${profile.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-ink hover:opacity-80"
            >
              <GithubMark />@{profile.githubLogin}
              <span className="text-teal" title="verified" aria-hidden="true">
                ✓
              </span>
            </a>
            <button
              type="button"
              onClick={disconnectGithub}
              className="text-xs text-white/50 transition hover:text-white"
            >
              {t.githubDisconnect}
            </button>
          </div>
        ) : (
          <a href={`/api/auth/github?next=${encodeURIComponent(pathname)}`} className="link-chip">
            <GithubMark />
            {t.githubConnect}
          </a>
        )}
        <p className="mt-1.5 text-[11px] text-ink/50">{t.githubVerifyHint}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="twitterUrl">
            {t.twitterLabel}
          </label>
          <input
            id="twitterUrl"
            type="url"
            className="input-field"
            value={form.twitterUrl}
            onChange={set("twitterUrl")}
            placeholder={t.twitterPlaceholder}
          />
          {xErr && <p className="mt-1 text-[11px] text-red-500">URL X/Twitter (https://x.com/…)</p>}
        </div>
      </div>

      {message && (
        <p
          className={`flex items-center gap-2 text-sm ${
            message.kind === "ok" ? "text-teal" : "text-red-600"
          }`}
        >
          {message.kind === "err" && <Alert />}
          {message.text}
        </p>
      )}

      <button
        type="submit"
        className="btn-teal"
        disabled={saving || uCheck === "taken" || uCheck === "checking" || emailErr || xErr}
      >
        {saving ? t.saving : t.save}
      </button>
    </form>
  );
}

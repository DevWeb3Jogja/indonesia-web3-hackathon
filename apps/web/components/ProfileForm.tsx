"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
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
  twitterUrl: string | null;
  role: string;
}

const EMPTY = {
  username: "",
  email: "",
  bio: "",
  githubUrl: "",
  twitterUrl: "",
};
type FormState = typeof EMPTY;

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
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const [status, setStatus] = useState<"idle" | "loading" | "unauth">("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
        githubUrl: data.githubUrl ?? "",
        twitterUrl: data.twitterUrl ?? "",
      });
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

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
    } else if (res.status === 400) {
      setMessage({ kind: "err", text: t.errorValidation });
    } else if (res.status === 429) {
      setMessage({ kind: "err", text: t.errorRate });
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
        <div>
          <p className="label-field">{t.roleLabel}</p>
          <p className="text-sm capitalize text-ink">{profile?.role}</p>
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
        <p className="mt-1 text-[11px] text-ink/50">{t.usernameHint}</p>
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="githubUrl">
            {t.githubLabel}
          </label>
          <input
            id="githubUrl"
            type="url"
            className="input-field"
            value={form.githubUrl}
            onChange={set("githubUrl")}
            placeholder={t.githubPlaceholder}
          />
        </div>
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

      <button type="submit" className="btn-teal" disabled={saving}>
        {saving ? t.saving : t.save}
      </button>
    </form>
  );
}

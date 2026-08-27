"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import type { SubmissionInput } from "@/lib/types";
import SubmissionForm from "./SubmissionForm";
import { Panel } from "./ui";

export default function EditFlow({
  id,
  locale,
  t,
  form,
}: {
  id: string;
  locale: string;
  t: Dict["edit"];
  form: Dict["form"];
}) {
  const router = useRouter();

  const [editCode, setEditCode] = useState("");
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [initial, setInitial] = useState<SubmissionInput | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/submissions/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.verifyFailed);
      setInitial(json.item as SubmissionInput);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : t.verifyFailed);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave(data: SubmissionInput) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, editCode, authEmail: email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.saveFailed);
      setSaved(true);
      setTimeout(() => router.push(localePath(locale, `/projects/${id}`)), 1200);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Panel clip="chamfer-lg">
          <div className="p-10">
            <p className="eyebrow">{t.savedEyebrow}</p>
            <h1 className="mt-4 font-firs text-2xl font-semibold uppercase tracking-tight text-ink">
              {t.savedTitle}
            </h1>
            <p className="mt-2 text-sm text-ink/70">{t.savedDesc}</p>
          </div>
        </Panel>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="mx-auto max-w-md">
        <Panel clip="chamfer-lg">
          <div className="p-8">
            <p className="eyebrow">{t.gateEyebrow}</p>
            <h1 className="mt-3 font-firs text-2xl font-semibold uppercase tracking-tight text-ink">
              {t.gateTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{t.gateDesc}</p>
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <div>
                <label className="label-field" htmlFor="edit-code">
                  {t.editCode}
                </label>
                <input
                  id="edit-code"
                  className="input-field font-mono uppercase tracking-widest"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder={t.editCodePlaceholder}
                  required
                />
              </div>
              <div>
                <label className="label-field" htmlFor="edit-email">
                  {t.email}
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  required
                />
              </div>
              {verifyError && (
                <p className="chamfer-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {verifyError}
                </p>
              )}
              <button type="submit" disabled={verifying} className="btn-teal w-full !py-3.5">
                {verifying ? t.verifying : t.unlock}
              </button>
            </form>
            <p className="mt-5 text-center text-xs text-ink/55">{t.lostCode}</p>
            <div className="mt-4 text-center">
              <Link
                href={localePath(locale, `/projects/${id}`)}
                className="text-sm text-ink/55 transition hover:text-teal"
              >
                {t.backToProject}
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <>
      <div className="mb-12">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="page-title mt-4">
          {t.title1}
          <br />
          {t.title2}
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-[1.5] text-ink/80">{t.lead}</p>
      </div>
      <SubmissionForm
        mode="edit"
        initial={initial}
        submitting={saving}
        error={saveError}
        onSubmit={handleSave}
        emailLocked
        t={form}
      />
    </>
  );
}

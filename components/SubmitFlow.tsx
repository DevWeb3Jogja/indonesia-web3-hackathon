"use client";

import { useState } from "react";
import Link from "next/link";
import SubmissionForm from "./SubmissionForm";
import EligibilityWarning from "./EligibilityWarning";
import { ArrowUpRight, Panel } from "./ui";
import { localePath } from "@/lib/locale";
import type { Dict } from "@/lib/i18n";
import type { SubmissionInput } from "@/lib/types";

interface Success {
  id: string;
  editCode: string;
}

export default function SubmitFlow({
  locale,
  t,
  form,
}: {
  locale: string;
  t: Dict["submit"];
  form: Dict["form"];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [copied, setCopied] = useState(false);

  const p = (path: string) => localePath(locale, path);

  async function handleSubmit(data: SubmissionInput) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.failed);
      setSuccess(json);
      // Scroll hidup di container shell, bukan di window.
      document
        .getElementById("scroll-root")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Panel clip="chamfer-lg">
        <div className="p-8 text-center md:p-12">
          <p className="eyebrow">{t.successEyebrow}</p>
          <h1 className="page-title mt-5">
            {t.successTitle1}
            <br />
            {t.successTitle2}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/80">
            {t.successLeadBefore}
            <strong className="font-semibold text-teal">{t.successLeadStrong}</strong>
            {t.successLeadAfter}
          </p>

          <div className="chamfer mt-8 bg-teal/[0.07] px-6 py-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-teal/70">
              {t.editCodeLabel}
            </p>
            <p className="grad-text mt-3 select-all font-firs text-3xl font-semibold tracking-[0.2em]">
              {success.editCode}
            </p>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(success.editCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="btn-outline mt-4 w-full border border-teal/25"
          >
            {copied ? t.copied : t.copy}
          </button>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={p(`/projects/${success.id}`)} className="btn-teal group flex-1">
              {t.viewProject}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={p("/projects")}
              className="btn-outline flex-1 border border-teal/25"
            >
              {t.allProjects}
            </Link>
          </div>
        </div>
      </Panel>
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
        <EligibilityWarning
          className="mt-8"
          label={t.warningLabel}
          message={t.warning}
          cta={t.warningCta}
        />
      </div>
      <SubmissionForm
        mode="create"
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        t={form}
      />
    </>
  );
}

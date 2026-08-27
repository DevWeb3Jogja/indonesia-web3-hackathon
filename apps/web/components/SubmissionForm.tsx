"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { ExtraLink, NetworkId, SubmissionInput, TeamMember, TrackId } from "@/lib/types";
import { NETWORKS, TRACKS } from "@/lib/types";
import MarkdownEditor from "./MarkdownEditor";
import { Panel, Plus } from "./ui";

/** Nilai awal form; template markdown-nya ikut bahasa aktif. */
export function emptyInput(t: Dict["form"]): SubmissionInput {
  return {
    projectName: "",
    tagline: "",
    teamName: "",
    tracks: [],
    contractAddress: "",
    network: "bsc",
    problemStatement: "",
    solution: "",
    description: t.descriptionTemplate,
    githubUrl: "",
    demoVideoUrl: "",
    demoUrl: "",
    teamMembers: [{ name: "", role: "", social: "" }],
    extraLinks: [],
    email: "",
    logoUrl: "",
  };
}

interface Props {
  initial?: SubmissionInput;
  mode: "create" | "edit";
  submitting: boolean;
  error: string | null;
  onSubmit: (data: SubmissionInput) => void;
  emailLocked?: boolean;
  t: Dict["form"];
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Panel clip="chamfer-lg">
      <section className="p-6 md:p-8">
        <div className="mb-7 flex items-baseline gap-4 border-b border-teal/15 pb-5">
          <span className="text-[11px] font-medium tracking-[0.2em] text-teal/70">
            {n.padStart(2, "0")}
          </span>
          <h2 className="font-firs text-xl font-semibold uppercase tracking-tight text-ink">
            {title}
          </h2>
        </div>
        <div className="space-y-5">{children}</div>
      </section>
    </Panel>
  );
}

/**
 * Tombol "tambah baris". Sebelumnya cuma teks 16px tanpa padding — secara
 * teknis jalan, tapi terlalu kecil untuk disentuh dan tidak terbaca sebagai
 * tombol. Sekarang target sentuh min-44px dengan border dan ikon.
 */
function AddButton({
  onClick,
  label,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="chamfer-sm inline-flex min-h-[44px] items-center gap-2 border border-teal/30 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal transition hover:bg-teal hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-teal"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 border border-teal/25 px-3 py-2 text-ink/50 transition hover:border-red-400 hover:text-red-500"
    >
      ✕
    </button>
  );
}

export default function SubmissionForm({
  initial,
  mode,
  submitting,
  error,
  onSubmit,
  emailLocked,
  t,
}: Props) {
  const [data, setData] = useState<SubmissionInput>(initial ?? emptyInput(t));

  const set = <K extends keyof SubmissionInput>(k: K, v: SubmissionInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const toggleTrack = (id: TrackId) =>
    set(
      "tracks",
      data.tracks.includes(id) ? data.tracks.filter((x) => x !== id) : [...data.tracks, id]
    );

  const setMember = (i: number, patch: Partial<TeamMember>) =>
    set(
      "teamMembers",
      data.teamMembers.map((m, j) => (j === i ? { ...m, ...patch } : m))
    );

  const setLink = (i: number, patch: Partial<ExtraLink>) =>
    set(
      "extraLinks",
      data.extraLinks.map((l, j) => (j === i ? { ...l, ...patch } : l))
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="space-y-5"
    >
      {/* 1. Project */}
      <Section n="1" title={t.section1}>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label-field" htmlFor="projectName">
              {t.projectName}
            </label>
            <input
              id="projectName"
              className="input-field"
              value={data.projectName}
              onChange={(e) => set("projectName", e.target.value)}
              placeholder={t.projectNamePlaceholder}
              required
            />
          </div>
          <div>
            <label className="label-field" htmlFor="teamName">
              {t.teamName}
            </label>
            <input
              id="teamName"
              className="input-field"
              value={data.teamName}
              onChange={(e) => set("teamName", e.target.value)}
              placeholder={t.teamNamePlaceholder}
              required
            />
          </div>
        </div>
        <div>
          <label className="label-field" htmlFor="tagline">
            {t.tagline}
          </label>
          <input
            id="tagline"
            className="input-field"
            value={data.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder={t.taglinePlaceholder}
          />
        </div>
        <div>
          <p className="label-field">{t.tracks}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {TRACKS.map((tr) => (
              <label
                key={tr.id}
                className={`chamfer-sm flex cursor-pointer items-center gap-3 px-4 py-3.5 transition ${
                  data.tracks.includes(tr.id)
                    ? "bg-teal text-white"
                    : "bg-haze text-ink hover:bg-teal/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={data.tracks.includes(tr.id)}
                  onChange={() => toggleTrack(tr.id)}
                  className="h-4 w-4 accent-[#066377]"
                />
                <span className="text-sm font-medium">
                  <span className="mr-1.5 text-xs opacity-60">{tr.code}</span>
                  {tr.label}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label-field" htmlFor="logo">
            {t.logo}
          </label>
          <input
            id="logo"
            className="input-field"
            value={data.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder={t.logoPlaceholder}
          />
        </div>
      </Section>

      {/* 2. Onchain */}
      <Section n="2" title={t.section2}>
        <div className="grid gap-5 md:grid-cols-[1fr_240px]">
          <div>
            <label className="label-field" htmlFor="contract">
              {t.contract}
            </label>
            <input
              id="contract"
              className="input-field font-mono"
              value={data.contractAddress}
              onChange={(e) => set("contractAddress", e.target.value)}
              placeholder="0x..."
              required
            />
            <p className="mt-1.5 text-xs text-ink/55">{t.contractHint}</p>
          </div>
          <div>
            <label className="label-field" htmlFor="network">
              {t.network}
            </label>
            <select
              id="network"
              className="input-field"
              value={data.network}
              onChange={(e) => set("network", e.target.value as NetworkId)}
            >
              {NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* 3. Cerita project */}
      <Section n="3" title={t.section3}>
        <div>
          <label className="label-field" htmlFor="problem">
            {t.problem}
          </label>
          <textarea
            id="problem"
            className="input-field resize-y"
            rows={4}
            value={data.problemStatement}
            onChange={(e) => set("problemStatement", e.target.value)}
            placeholder={t.problemPlaceholder}
            required
          />
        </div>
        <div>
          <label className="label-field" htmlFor="solution">
            {t.solution}
          </label>
          <textarea
            id="solution"
            className="input-field resize-y"
            rows={4}
            value={data.solution}
            onChange={(e) => set("solution", e.target.value)}
            placeholder={t.solutionPlaceholder}
            required
          />
        </div>
        <div>
          <p className="label-field">{t.description}</p>
          <MarkdownEditor value={data.description} onChange={(v) => set("description", v)} t={t} />
        </div>
      </Section>

      {/* 4. Links */}
      <Section n="4" title={t.section4}>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label-field" htmlFor="github">
              {t.github}
            </label>
            <input
              id="github"
              className="input-field"
              value={data.githubUrl}
              onChange={(e) => set("githubUrl", e.target.value)}
              placeholder="https://github.com/tim/project"
              required
            />
          </div>
          <div>
            <label className="label-field" htmlFor="demoVideo">
              {t.demoVideo}
            </label>
            <input
              id="demoVideo"
              className="input-field"
              value={data.demoVideoUrl}
              onChange={(e) => set("demoVideoUrl", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </div>
        </div>
        <div>
          <label className="label-field" htmlFor="demoUrl">
            {t.demoUrl}
          </label>
          <input
            id="demoUrl"
            className="input-field"
            value={data.demoUrl}
            onChange={(e) => set("demoUrl", e.target.value)}
            placeholder="https://app.projectkamu.xyz"
          />
        </div>
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="label-field !mb-0">{t.extraLinks}</p>
            <AddButton
              label={t.addLink}
              onClick={() => set("extraLinks", [...data.extraLinks, { label: "", url: "" }])}
            />
          </div>
          <div className="space-y-3">
            {data.extraLinks.map((l, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: input terkontrol, nilai dari array — aman saat hapus/reorder
              <div key={i} className="flex gap-3">
                <input
                  className="input-field !w-44"
                  value={l.label}
                  onChange={(e) => setLink(i, { label: e.target.value })}
                  placeholder={t.linkLabelPlaceholder}
                />
                <input
                  className="input-field flex-1"
                  value={l.url}
                  onChange={(e) => setLink(i, { url: e.target.value })}
                  placeholder="https://..."
                />
                <RemoveButton
                  label={t.removeLink}
                  onClick={() =>
                    set(
                      "extraLinks",
                      data.extraLinks.filter((_, j) => j !== i)
                    )
                  }
                />
              </div>
            ))}
            {data.extraLinks.length === 0 && (
              <p className="text-xs text-ink/55">{t.noExtraLinks}</p>
            )}
          </div>
        </div>
      </Section>

      {/* 5. Team */}
      <Section n="5" title={t.section5}>
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="label-field !mb-0">{t.members}</p>
            <AddButton
              label={t.addMember}
              disabled={data.teamMembers.length >= 10}
              onClick={() =>
                set("teamMembers", [...data.teamMembers, { name: "", role: "", social: "" }])
              }
            />
          </div>
          <div className="space-y-3">
            {data.teamMembers.map((m, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: input terkontrol, nilai dari array — aman saat hapus/reorder
              <div key={i} className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="input-field"
                  value={m.name}
                  onChange={(e) => setMember(i, { name: e.target.value })}
                  placeholder={`${t.memberNamePlaceholder} ${i + 1} *`}
                />
                <input
                  className="input-field"
                  value={m.role}
                  onChange={(e) => setMember(i, { role: e.target.value })}
                  placeholder={t.memberRolePlaceholder}
                />
                <input
                  className="input-field"
                  value={m.social}
                  onChange={(e) => setMember(i, { social: e.target.value })}
                  placeholder={t.memberSocialPlaceholder}
                />
                {data.teamMembers.length > 1 && (
                  <RemoveButton
                    label={t.removeMember}
                    onClick={() =>
                      set(
                        "teamMembers",
                        data.teamMembers.filter((_, j) => j !== i)
                      )
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="label-field" htmlFor="email">
            {t.email} {emailLocked && t.emailLocked}
          </label>
          <input
            id="email"
            type="email"
            className="input-field disabled:opacity-60"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="tim@email.com"
            disabled={emailLocked}
            required
          />
          {mode === "create" && <p className="mt-1.5 text-xs text-ink/55">{t.emailHint}</p>}
        </div>
      </Section>

      {error && (
        <p className="chamfer-sm border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-teal w-full !py-4 !text-xs">
        {submitting ? t.saving : mode === "create" ? t.submitCreate : t.submitEdit}
      </button>
    </form>
  );
}

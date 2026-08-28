"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { NETWORKS, TRACKS } from "@/lib/types";
import MarkdownEditor from "./MarkdownEditor";

type FormDict = Dict["form"];

export interface ProjectData {
  name: string;
  tagline: string;
  tracks: string[];
  logoUrl: string;
  contractAddress: string;
  network: string;
  problemStatement: string;
  solution: string;
  description: string;
  githubUrl: string;
  demoUrl: string;
  demoVideoUrl: string;
}

const EMPTY: ProjectData = {
  name: "",
  tagline: "",
  tracks: [],
  logoUrl: "",
  contractAddress: "",
  network: NETWORKS[0].id,
  problemStatement: "",
  solution: "",
  description: "",
  githubUrl: "",
  demoUrl: "",
  demoVideoUrl: "",
};

/** "" → null untuk field opsional; tracks & name tetap. */
function toPayload(d: ProjectData) {
  const opt = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    name: d.name.trim(),
    tracks: d.tracks,
    tagline: opt(d.tagline),
    logoUrl: opt(d.logoUrl),
    contractAddress: opt(d.contractAddress),
    network: d.contractAddress.trim() ? d.network : null,
    problemStatement: opt(d.problemStatement),
    solution: opt(d.solution),
    description: opt(d.description),
    githubUrl: opt(d.githubUrl),
    demoUrl: opt(d.demoUrl),
    demoVideoUrl: opt(d.demoVideoUrl),
  };
}

export default function ProjectForm({
  form,
  initial,
  submitLabel,
  savingLabel,
  busy,
  onSubmit,
}: {
  form: FormDict;
  initial?: Partial<ProjectData>;
  submitLabel: string;
  savingLabel: string;
  busy: boolean;
  onSubmit: (payload: ReturnType<typeof toPayload>) => void;
}) {
  const [d, setD] = useState<ProjectData>({ ...EMPTY, ...initial });
  const set = <K extends keyof ProjectData>(k: K, v: ProjectData[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));
  const toggleTrack = (id: string) =>
    setD((prev) => ({
      ...prev,
      tracks: prev.tracks.includes(id) ? prev.tracks.filter((t) => t !== id) : [...prev.tracks, id],
    }));

  const trackError = d.tracks.length === 0;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (trackError) return;
        onSubmit(toPayload(d));
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="p-name">
            {form.projectName}
          </label>
          <input
            id="p-name"
            className="input-field"
            value={d.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={form.projectNamePlaceholder}
            minLength={2}
            maxLength={80}
            required
          />
        </div>
        <div>
          <label className="label-field" htmlFor="p-tagline">
            {form.tagline}
          </label>
          <input
            id="p-tagline"
            className="input-field"
            value={d.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder={form.taglinePlaceholder}
            maxLength={140}
          />
        </div>
      </div>

      <div>
        <p className="label-field">{form.tracks}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {TRACKS.map((tr) => {
            const on = d.tracks.includes(tr.id);
            return (
              <button
                type="button"
                key={tr.id}
                onClick={() => toggleTrack(tr.id)}
                className={`chamfer-sm px-4 py-3 text-left text-sm transition ${
                  on
                    ? "bg-teal text-white"
                    : "border border-teal/25 bg-white/[0.04] text-ink hover:bg-haze"
                }`}
              >
                {tr.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="p-contract">
            {form.contract}
          </label>
          <input
            id="p-contract"
            className="input-field font-mono"
            value={d.contractAddress}
            onChange={(e) => set("contractAddress", e.target.value)}
            placeholder="0x…"
          />
          <p className="mt-1 text-[11px] text-ink/50">{form.contractHint}</p>
        </div>
        <div>
          <label className="label-field" htmlFor="p-network">
            {form.network}
          </label>
          <select
            id="p-network"
            className="input-field"
            value={d.network}
            onChange={(e) => set("network", e.target.value)}
          >
            {NETWORKS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="p-logo">
          {form.logo}
        </label>
        <input
          id="p-logo"
          type="url"
          className="input-field"
          value={d.logoUrl}
          onChange={(e) => set("logoUrl", e.target.value)}
          placeholder={form.logoPlaceholder}
        />
      </div>

      <div>
        <label className="label-field" htmlFor="p-problem">
          {form.problem}
        </label>
        <textarea
          id="p-problem"
          className="input-field min-h-24"
          value={d.problemStatement}
          onChange={(e) => set("problemStatement", e.target.value)}
          placeholder={form.problemPlaceholder}
          maxLength={2000}
        />
      </div>

      <div>
        <label className="label-field" htmlFor="p-solution">
          {form.solution}
        </label>
        <textarea
          id="p-solution"
          className="input-field min-h-24"
          value={d.solution}
          onChange={(e) => set("solution", e.target.value)}
          placeholder={form.solutionPlaceholder}
          maxLength={2000}
        />
      </div>

      <div>
        <p className="label-field">{form.description}</p>
        <MarkdownEditor value={d.description} onChange={(v) => set("description", v)} t={form} />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className="label-field" htmlFor="p-github">
            {form.github}
          </label>
          <input
            id="p-github"
            type="url"
            className="input-field"
            value={d.githubUrl}
            onChange={(e) => set("githubUrl", e.target.value)}
            placeholder="https://github.com/…"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="p-demo">
            {form.demoUrl}
          </label>
          <input
            id="p-demo"
            type="url"
            className="input-field"
            value={d.demoUrl}
            onChange={(e) => set("demoUrl", e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="p-video">
            {form.demoVideo}
          </label>
          <input
            id="p-video"
            type="url"
            className="input-field"
            value={d.demoVideoUrl}
            onChange={(e) => set("demoVideoUrl", e.target.value)}
            placeholder="https://youtube.com/…"
          />
        </div>
      </div>

      <button type="submit" className="btn-teal" disabled={busy || trackError}>
        {busy ? savingLabel : submitLabel}
      </button>
    </form>
  );
}

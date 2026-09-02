"use client";

import { useEffect, useState } from "react";
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
  xUrl: string;
  linkedinUrl: string;
  pitchDeckUrl: string;
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
  xUrl: "",
  linkedinUrl: "",
  pitchDeckUrl: "",
};

/** Socials + pitch deck (opsional) → array {label,url} untuk kolom extra_links. */
function toExtraLinks(d: ProjectData) {
  return [
    { label: "X", url: d.xUrl },
    { label: "LinkedIn", url: d.linkedinUrl },
    { label: "Pitch Deck", url: d.pitchDeckUrl },
  ]
    .filter((e) => e.url.trim() !== "")
    .map((e) => ({ label: e.label, url: e.url.trim() }));
}

/** Resize gambar ke kotak `size` (cover) → data URL webp. Gratis, tanpa storage. */
function resizeToDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("no canvas"));
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/webp", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load fail"));
    };
    img.src = url;
  });
}

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
    extraLinks: toExtraLinks(d),
  };
}

/** Draft submit disimpan di localStorage (mode create) → refresh tak menghapus
 *  isian. Dibersihkan setelah submit sukses (clearProjectDraft dari ProjectSubmit). */
export const PROJECT_DRAFT_KEY = "iw3h:project-draft";
export function clearProjectDraft() {
  try {
    localStorage.removeItem(PROJECT_DRAFT_KEY);
  } catch {
    /* localStorage tak tersedia */
  }
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
  const isEdit = initial != null;
  const [d, setD] = useState<ProjectData>(() => {
    const base = { ...EMPTY, ...initial };
    // Mode create → pulihkan draft dari localStorage supaya refresh tak menghapus isian.
    if (isEdit || typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem(PROJECT_DRAFT_KEY);
      if (raw) return { ...base, ...(JSON.parse(raw) as Partial<ProjectData>) };
    } catch {
      /* draft korup → abaikan */
    }
    return base;
  });

  // Autosave draft (mode create) tiap ada perubahan.
  useEffect(() => {
    if (isEdit) return;
    try {
      localStorage.setItem(PROJECT_DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* kuota/akses localStorage gagal → biarkan */
    }
  }, [d, isEdit]);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const set = <K extends keyof ProjectData>(k: K, v: ProjectData[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoErr(null);
    if (!file.type.startsWith("image/")) return setLogoErr(form.logoInvalid);
    if (file.size > 5 * 1024 * 1024) return setLogoErr(form.logoTooBig);
    try {
      set("logoUrl", await resizeToDataUrl(file, 256));
    } catch {
      setLogoErr(form.logoInvalid);
    }
  }
  const toggleTrack = (id: string) =>
    setD((prev) => ({
      ...prev,
      tracks: prev.tracks.includes(id) ? prev.tracks.filter((t) => t !== id) : [...prev.tracks, id],
    }));

  const [tried, setTried] = useState(false);

  // Validasi format (selaras dengan skema server) — biar user tahu field mana.
  const isHttps = (v: string) => v.trim() === "" || /^https:\/\/\S+$/i.test(v.trim());
  const nameError = d.name.trim().length < 2;
  const trackError = d.tracks.length === 0;
  const contractError =
    d.contractAddress.trim() !== "" && !/^0x[0-9a-fA-F]{40}$/.test(d.contractAddress.trim());
  const githubError = !isHttps(d.githubUrl);
  const demoError = !isHttps(d.demoUrl);
  const videoError = !isHttps(d.demoVideoUrl);
  const xError = !isHttps(d.xUrl);
  const linkedinError = !isHttps(d.linkedinUrl);
  const pitchError = !isHttps(d.pitchDeckUrl);
  // Wajib untuk submission BARU (create). Edit tak dipaksa (submitter lama).
  const logoMissing = !isEdit && d.logoUrl.trim() === "";
  const websiteMissing = !isEdit && d.demoUrl.trim() === "";
  const videoMissing = !isEdit && d.demoVideoUrl.trim() === "";
  const hasError =
    nameError ||
    trackError ||
    contractError ||
    githubError ||
    demoError ||
    videoError ||
    xError ||
    linkedinError ||
    pitchError ||
    logoMissing ||
    websiteMissing ||
    videoMissing;

  const fieldMsg = (show: boolean, msg: string) =>
    show ? <p className="mt-1 text-[11px] text-red-500">{msg}</p> : null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (hasError) return setTried(true);
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
          {fieldMsg(tried && nameError, form.errName)}
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
                    ? "bg-white text-black"
                    : "border border-teal/25 bg-white/[0.04] text-ink hover:bg-haze"
                }`}
              >
                {tr.label}
              </button>
            );
          })}
        </div>
        {fieldMsg(tried && trackError, form.errTracks)}
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
          {fieldMsg(contractError, form.errContract)}
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
        <span className="label-field">{form.logo}</span>
        <div className="flex items-center gap-4">
          {d.logoUrl ? (
            <img
              src={d.logoUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/15 text-[10px] uppercase tracking-wider text-white/30">
              Logo
            </div>
          )}
          <div className="flex flex-col items-start gap-1.5">
            <label
              htmlFor="p-logo"
              className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/50 hover:bg-white/5"
            >
              {form.logoChoose}
            </label>
            <input
              id="p-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onLogoFile}
              className="hidden"
            />
            {d.logoUrl && (
              <button
                type="button"
                onClick={() => set("logoUrl", "")}
                className="text-xs text-white/50 transition hover:text-white"
              >
                {form.logoRemove}
              </button>
            )}
          </div>
        </div>
        {logoErr && <p className="mt-1 text-[11px] text-red-500">{logoErr}</p>}
        {fieldMsg(tried && logoMissing, form.errRequired)}
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
          {fieldMsg(githubError, form.errUrl)}
        </div>
        <div>
          <label className="label-field" htmlFor="p-demo">
            {form.website}
          </label>
          <input
            id="p-demo"
            type="url"
            className="input-field"
            value={d.demoUrl}
            onChange={(e) => set("demoUrl", e.target.value)}
            placeholder="https://…"
          />
          {fieldMsg(tried && websiteMissing, form.errRequired)}
          {fieldMsg(demoError, form.errUrl)}
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
          {fieldMsg(tried && videoMissing, form.errRequired)}
          {fieldMsg(videoError, form.errUrl)}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className="label-field" htmlFor="p-x">
            {form.socialX}
          </label>
          <input
            id="p-x"
            type="url"
            className="input-field"
            value={d.xUrl}
            onChange={(e) => set("xUrl", e.target.value)}
            placeholder="https://x.com/…"
          />
          {fieldMsg(xError, form.errUrl)}
        </div>
        <div>
          <label className="label-field" htmlFor="p-linkedin">
            {form.socialLinkedin}
          </label>
          <input
            id="p-linkedin"
            type="url"
            className="input-field"
            value={d.linkedinUrl}
            onChange={(e) => set("linkedinUrl", e.target.value)}
            placeholder="https://linkedin.com/…"
          />
          {fieldMsg(linkedinError, form.errUrl)}
        </div>
        <div>
          <label className="label-field" htmlFor="p-pitch">
            {form.pitchDeck}
          </label>
          <input
            id="p-pitch"
            type="url"
            className="input-field"
            value={d.pitchDeckUrl}
            onChange={(e) => set("pitchDeckUrl", e.target.value)}
            placeholder="https://canva.com/… / drive…"
          />
          {fieldMsg(pitchError, form.errUrl)}
        </div>
      </div>

      {tried && hasError && <p className="text-sm text-red-500">{form.errFix}</p>}
      <button type="submit" className="btn-teal" disabled={busy}>
        {busy ? savingLabel : submitLabel}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProjectCard from "./ProjectCard";
import { ArrowUpRight, Panel } from "./ui";
import { TRACKS } from "@/lib/types";
import type { Submission } from "@/lib/types";
import { localePath } from "@/lib/locale";
import type { Dict } from "@/lib/i18n";

export default function ProjectsBrowser({
  locale,
  t,
}: {
  locale: string;
  t: Dict["projects"];
}) {
  const [items, setItems] = useState<Submission[] | null>(null);
  const [error, setError] = useState(false);
  const [track, setTrack] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setError(true));
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((p) => {
      const okTrack = track === "all" || p.tracks.includes(track as never);
      const s = q.trim().toLowerCase();
      const okQ =
        !s ||
        p.projectName.toLowerCase().includes(s) ||
        p.teamName.toLowerCase().includes(s) ||
        p.tagline.toLowerCase().includes(s);
      return okTrack && okQ;
    });
  }, [items, track, q]);

  return (
    <>
      {/* Filter */}
      <div className="mt-12 flex flex-col gap-4 border-y border-teal/15 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[{ id: "all", label: t.all }, ...TRACKS].map((tr) => (
            <button
              key={tr.id}
              onClick={() => setTrack(tr.id)}
              className={`chamfer-sm px-4 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition ${
                track === tr.id
                  ? "bg-teal text-white"
                  : "bg-white text-ink/70 hover:text-teal"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchLabel}
          className="input-field sm:!w-64"
        />
      </div>

      {/* Grid */}
      <div className="mt-10">
        {error ? (
          <p className="py-24 text-center text-ink/60">{t.loadError}</p>
        ) : items === null ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="chamfer-lg h-52 animate-pulse bg-white/70" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Panel clip="chamfer-lg" className="mx-auto max-w-md">
            <div className="p-12 text-center">
              <p className="eyebrow">
                {items.length === 0 ? t.emptyEyebrow : t.noResultEyebrow}
              </p>
              <p className="mt-4 font-firs text-xl font-semibold uppercase text-ink">
                {items.length === 0 ? t.emptyTitle : t.noResultTitle}
              </p>
              <p className="mt-2 text-sm text-ink/70">
                {items.length === 0 ? t.emptyDesc : t.noResultDesc}
              </p>
              {items.length === 0 && (
                <Link
                  href={localePath(locale, "/submit")}
                  className="btn-teal group mt-8"
                >
                  {t.submitCta}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </Panel>
        ) : (
          <>
            <p className="mb-5 text-[10px] uppercase tracking-[0.2em] text-teal/70">
              {filtered.length} {t.count}
            </p>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProjectCard key={p.id} p={p} locale={locale} byLabel={t.by} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

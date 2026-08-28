"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import type { PublicProjectCard } from "@/lib/types";
import { TRACKS } from "@/lib/types";
import ProjectCard from "./ProjectCard";
import { ArrowUpRight, Panel } from "./ui";

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
type Sort = "newest" | "oldest" | "name";

export default function ProjectsBrowser({ locale, t }: { locale: string; t: Dict["projects"] }) {
  const [items, setItems] = useState<PublicProjectCard[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState(false);
  const [track, setTrack] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Debounce input search (300ms) supaya tak query tiap ketikan.
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Reset ke halaman 1 saat filter/search/sort berubah.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset page hanya saat kriteria berubah
  useEffect(() => {
    setPage(1);
  }, [track, debouncedQ, sort]);

  // Guard race: hanya pakai respons fetch terakhir.
  const reqId = useRef(0);
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), limit: "12", sort });
    if (track !== "all") params.set("track", track);
    if (debouncedQ) params.set("q", debouncedQ);
    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (id !== reqId.current) return;
        setItems(j.items ?? []);
        setMeta(j.meta ?? null);
      })
      .catch(() => id === reqId.current && setError(true))
      .finally(() => id === reqId.current && setLoading(false));
  }, [page, track, debouncedQ, sort]);

  const filters = useMemo(() => [{ id: "all", label: t.all }, ...TRACKS], [t.all]);

  return (
    <>
      {/* Kontrol: filter track · sort · search */}
      <div className="mt-12 flex flex-col gap-4 border-y border-teal/15 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((tr) => (
              <button
                type="button"
                key={tr.id}
                onClick={() => setTrack(tr.id)}
                className={`chamfer-sm px-4 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition ${
                  track === tr.id
                    ? "bg-teal text-white"
                    : "bg-white/[0.04] text-ink/70 hover:text-teal"
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-ink/50">
              {t.sortLabel}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="input-field !w-auto !py-2 text-xs"
              >
                <option value="newest">{t.sortNewest}</option>
                <option value="oldest">{t.sortOldest}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchLabel}
              className="input-field sm:!w-64"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-10">
        {error ? (
          <p className="py-24 text-center text-ink/60">{t.loadError}</p>
        ) : items === null || (loading && items.length === 0) ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton statis, tidak pernah reorder
              <div key={i} className="chamfer-lg h-52 animate-pulse bg-white/70" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Panel clip="chamfer-lg" className="mx-auto max-w-md">
            <div className="p-12 text-center">
              <p className="eyebrow">
                {meta?.total === 0 && !debouncedQ && track === "all"
                  ? t.emptyEyebrow
                  : t.noResultEyebrow}
              </p>
              <p className="mt-4 font-firs text-xl font-semibold uppercase text-ink">
                {meta?.total === 0 && !debouncedQ && track === "all"
                  ? t.emptyTitle
                  : t.noResultTitle}
              </p>
              <p className="mt-2 text-sm text-ink/70">
                {meta?.total === 0 && !debouncedQ && track === "all" ? t.emptyDesc : t.noResultDesc}
              </p>
              {meta?.total === 0 && !debouncedQ && track === "all" && (
                <Link href={localePath(locale, "/submit")} className="btn-teal group mt-8">
                  {t.submitCta}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </Panel>
        ) : (
          <>
            <p className="mb-5 text-[10px] uppercase tracking-[0.2em] text-teal/70">
              {meta?.total ?? items.length} {t.count}
            </p>
            <div
              className={`grid gap-5 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-50" : ""}`}
            >
              {items.map((p) => (
                <ProjectCard key={p.id} p={p} locale={locale} byLabel={t.by} soloLabel={t.solo} />
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  type="button"
                  className="btn-outline disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={meta.page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t.prev}
                </button>
                <span className="text-[11px] uppercase tracking-[0.14em] text-ink/60">
                  {t.pageOf
                    .replace("{page}", String(meta.page))
                    .replace("{total}", String(meta.totalPages))}
                </span>
                <button
                  type="button"
                  className="btn-outline disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={meta.page >= meta.totalPages || loading}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  {t.next}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

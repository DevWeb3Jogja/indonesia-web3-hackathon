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
    fetch(`/api/projects?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (id !== reqId.current) return;
        const next: PublicProjectCard[] = j.items ?? [];
        // Halaman 1 = ganti; halaman berikutnya = tambah (infinite scroll). Dedupe by id:
        // offset bisa bergeser kalau ada submit baru di antara dua load.
        setItems((prev) => {
          if (page === 1 || !prev) return next;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...next.filter((p) => !seen.has(p.id))];
        });
        setMeta(j.meta ?? null);
      })
      .catch(() => id === reqId.current && setError(true))
      .finally(() => id === reqId.current && setLoading(false));
  }, [page, track, debouncedQ, sort]);

  const hasMore = !!meta && meta.page < meta.totalPages;
  const sentinel = useRef<HTMLDivElement>(null);
  // Re-observe tiap selesai load → callback awal observe() mengecek ulang: kalau
  // sentinel masih terlihat (halaman belum penuh), lanjut muat halaman berikutnya.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setPage((p) => p + 1);
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading]);

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
                    ? "bg-white text-black"
                    : "bg-white/[0.04] text-ink/70 hover:text-teal"
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <label className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-ink/50">
              {t.sortLabel}
              <span className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="input-field !w-auto appearance-none pr-9 text-sm"
                >
                  <option value="newest">{t.sortNewest}</option>
                  <option value="oldest">{t.sortOldest}</option>
                  <option value="name">{t.sortName}</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchLabel}
              className="input-field min-w-0 flex-1 sm:!w-64 sm:flex-none"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-10">
        {error ? (
          <p className="py-24 text-center text-ink/60">{t.loadError}</p>
        ) : items === null || (loading && items.length === 0) ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton statis, tidak pernah reorder
              <div key={i} className="chamfer-lg h-52 animate-pulse bg-white/[0.06]" />
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
              className={`grid grid-cols-1 gap-5 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${loading && page === 1 ? "opacity-50" : ""}`}
            >
              {items.map((p) => (
                <ProjectCard key={p.id} p={p} locale={locale} byLabel={t.by} soloLabel={t.solo} />
              ))}
            </div>

            {/* Infinite scroll: sentinel auto-load + tombol fallback (keyboard/a11y). */}
            <div ref={sentinel} className="mt-10 flex justify-center">
              {loading && page > 1 ? (
                // Memuat halaman berikutnya → spinner (CSS murni).
                <span role="status" className="flex h-11 items-center">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/80" />
                  <span className="sr-only">{t.loading}</span>
                </span>
              ) : hasMore ? (
                <button type="button" className="btn-outline" onClick={() => setPage((p) => p + 1)}>
                  {t.loadMore}
                </button>
              ) : (
                meta &&
                meta.totalPages > 1 && (
                  <p className="text-[11px] uppercase tracking-[0.14em] text-ink/40">
                    {t.allLoaded}
                  </p>
                )
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

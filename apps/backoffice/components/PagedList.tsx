"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

export interface Column<T> {
  header: string;
  cell: (row: T, reload: () => void) => ReactNode;
}
export interface SelectFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}
interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Tabel client generik untuk "data banyak": search + filter + sort + paginasi
 * (page-based, memakai meta dari API — API juga menyediakan cursor untuk skala).
 */
export default function PagedList<T>({
  endpoint,
  columns,
  rowKey,
  searchPlaceholder = "Cari…",
  filters = [],
  sorts = [],
}: {
  endpoint: string;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  filters?: SelectFilter[];
  sorts?: { value: string; label: string }[];
}) {
  const [q, setQ] = useState("");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    const sp = new URLSearchParams({ page: String(page), limit: "20" });
    if (q.trim()) sp.set("q", q.trim());
    if (sort) sp.set("sort", sort);
    for (const [k, v] of Object.entries(filterVals)) if (v) sp.set(k, v);
    try {
      const res = await fetch(`${endpoint}?${sp}`);
      if (!res.ok) return setState("error");
      const data = await res.json();
      setItems(data.items ?? []);
      setMeta(data.meta ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [endpoint, page, q, sort, filterVals]);

  // debounce (search berubah cepat); filter/sort juga lewat sini.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // ubah query → balik ke page 1.
  function reset<V>(setter: (v: V) => void) {
    return (v: V) => {
      setPage(1);
      setter(v);
    };
  }

  return (
    <div className="paged">
      <div className="controls">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => reset(setQ)(e.target.value)}
        />
        {filters.map((f) => (
          <select
            key={f.key}
            value={filterVals[f.key] ?? ""}
            onChange={(e) =>
              reset((v: string) => setFilterVals((s) => ({ ...s, [f.key]: v })))(e.target.value)
            }
          >
            <option value="">{f.label}: semua</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {sorts.length > 0 && (
          <select value={sort} onChange={(e) => reset(setSort)(e.target.value)}>
            <option value="">Urut: default</option>
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        {meta && (
          <span className="total">
            {meta.total} total{state === "loading" ? " · memuat…" : ""}
          </span>
        )}
      </div>

      {state === "error" ? (
        <p className="note err">
          Gagal memuat.{" "}
          <button type="button" onClick={load}>
            Coba lagi
          </button>
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.header}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && state === "ready" && (
              <tr>
                <td colSpan={columns.length}>Tidak ada data.</td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.header}>{c.cell(row, load)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {meta && (
        <div className="pager">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ‹ Prev
          </button>
          <span>
            Hal {meta.page} / {meta.totalPages}
          </span>
          <button type="button" onClick={() => setPage((p) => p + 1)} disabled={!meta.hasMore}>
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

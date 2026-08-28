"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const ALL = "__all__";

/** Tabel data-banyak: search + filter + sort + paginasi (page; API juga cursor). */
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

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8"
            type="search"
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        {filters.map((f) => (
          <Select
            key={f.key}
            value={filterVals[f.key] || ALL}
            onValueChange={(v) => {
              setPage(1);
              setFilterVals((s) => ({ ...s, [f.key]: v === ALL ? "" : v }));
            }}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{f.label}: semua</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {sorts.length > 0 && (
          <Select
            value={sort || ALL}
            onValueChange={(v) => {
              setPage(1);
              setSort(v === ALL ? "" : v);
            }}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Urut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Urut: default</SelectItem>
              {sorts.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {meta && (
          <span className="ml-auto text-xs text-muted-foreground">
            {meta.total} total{state === "loading" ? " · memuat…" : ""}
          </span>
        )}
      </div>

      {state === "error" ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          Gagal memuat.
          <Button size="sm" variant="outline" onClick={load}>
            Coba lagi
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.header}>{c.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && state === "ready" && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              )}
              {items.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((c) => (
                    <TableCell key={c.header}>{c.cell(row, load)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta && (
        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
          <span>
            Hal {meta.page} / {meta.totalPages}
          </span>
          <Button
            size="icon-xs"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon-xs"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta.hasMore}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

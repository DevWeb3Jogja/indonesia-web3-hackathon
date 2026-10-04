"use client";

// Hanya TIPE dari @iw3h/db — import nilai akan menyeret drizzle ke bundle client.
import type { FinalRow } from "@iw3h/db";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Row = Pick<FinalRow, "id" | "name" | "teamName" | "position" | "positionSaved">;

const serverOrder = (rows: Row[]) =>
  [...rows].sort((a, b) => a.position - b.position).map((r) => r.id);

/** Draf yang sedang diedit tetap dipakai saat rekap dipoll; finalis yang hilang dibuang,
 *  finalis baru ditambahkan di belakang (sama seperti urutan server). */
function reconcile(draft: string[], server: string[]): string[] {
  const live = new Set(server);
  const kept = draft.filter((id) => live.has(id));
  return [...kept, ...server.filter((id) => !kept.includes(id))];
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Admin mengatur urutan presentasi finalis; form juri mengikuti urutan ini. */
export default function PresentationOrder({
  rows,
  frozen,
  onSaved,
}: {
  rows: Row[];
  /** Hackathon completed → urutan beku. */
  frozen: boolean;
  onSaved: () => Promise<void>;
}) {
  const server = serverOrder(rows);
  const serverKey = server.join("|");
  const [draft, setDraft] = useState<string[]>(server);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const refocus = useRef<string | null>(null);

  // Poll rekap membawa urutan terbaru: tanpa edit → ikut server; sedang diedit → rekonsiliasi.
  // biome-ignore lint/correctness/useExhaustiveDependencies: serverKey mewakili `server`
  useEffect(() => {
    setDraft((d) => (dirty ? reconcile(d, server) : server));
  }, [serverKey, dirty]);

  // Tombol yang diklik ikut berpindah bersama barisnya → kembalikan fokus ke sana
  // (atau ke arah sebaliknya kalau tombolnya kini nonaktif di ujung daftar).
  useEffect(() => {
    const key = refocus.current;
    if (!key) return;
    refocus.current = null;
    const [id, dir] = key.split(":");
    const other = dir === "up" ? "down" : "up";
    const el =
      listRef.current?.querySelector<HTMLButtonElement>(
        `[data-move="${id}:${dir}"]:not(:disabled)`
      ) ?? listRef.current?.querySelector<HTMLButtonElement>(`[data-move="${id}:${other}"]`);
    el?.focus();
  });

  const byId = new Map(rows.map((r) => [r.id, r]));
  const unsavedRows = rows.filter((r) => !r.positionSaved).length;
  const changed = dirty && !same(draft, server);

  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    refocus.current = `${draft[i]}:${delta < 0 ? "up" : "down"}`;
    setDraft(next);
    setDirty(true);
    setAnnounce(`${byId.get(draft[i])?.name ?? ""} → #${j + 1}`);
  }

  async function save() {
    setBusy(true);
    let ok = false;
    try {
      const res = await fetch("/api/admin/judging/order", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectIds: draft }),
      });
      ok = res.ok;
      if (ok) toast.success("Presentation order saved");
      else toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    } catch {
      toast.error("Network error");
    }
    // Muat ulang dulu, baru lepas draf → tak sempat berkedip ke urutan lama.
    await onSaved();
    if (ok) setDirty(false);
    setBusy(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presentation order</CardTitle>
        <CardDescription>
          The order finalists present on demo day. The judge form follows this order. Finalists
          added after saving go last until you save again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {draft.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No finalists yet. Mark the demo day finalists (star) on the Projects page.
          </p>
        ) : (
          <>
            <ol ref={listRef} className="divide-y divide-gray-100 dark:divide-gray-800">
              {draft.map((id, i) => {
                const r = byId.get(id);
                if (!r) return null;
                return (
                  <li key={id} className="flex items-center gap-3 py-2">
                    <span className="w-8 text-right font-semibold tabular-nums text-gray-800 dark:text-white/90">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {r.name}
                      </p>
                      <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {r.teamName ?? "Solo"}
                      </p>
                    </div>
                    {!r.positionSaved && <Badge variant="outline">Not in saved order</Badge>}
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        data-move={`${id}:up`}
                        disabled={frozen || busy || i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={`Move ${r.name} up`}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        data-move={`${id}:down`}
                        disabled={frozen || busy || i === draft.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={`Move ${r.name} down`}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                onClick={save}
                disabled={frozen || busy || (!changed && unsavedRows === 0)}
              >
                {busy ? "Saving…" : "Save order"}
              </Button>
              {dirty && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setDirty(false);
                    setDraft(server);
                  }}
                >
                  Discard changes
                </Button>
              )}
              <span
                className={cn(
                  "text-theme-xs",
                  changed || unsavedRows > 0
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {frozen
                  ? "Hackathon completed — order is locked."
                  : changed
                    ? "Unsaved changes"
                    : unsavedRows > 0
                      ? `${unsavedRows} finalist(s) not in the saved order yet — save to include them.`
                      : "Saved"}
              </span>
              <span className="sr-only" aria-live="polite">
                {announce}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

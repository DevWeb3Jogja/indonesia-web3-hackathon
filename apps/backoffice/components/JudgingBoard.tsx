"use client";

// Hanya TIPE dari @iw3h/db — import nilai akan menyeret drizzle/node:crypto ke bundle client.
import type { FinalCriterion, FinalRow } from "@iw3h/db";
import { Download, Maximize2, MessageSquareText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { cn, short } from "@/lib/utils";

export interface Board {
  criteria: FinalCriterion[];
  judges: { address: string; name: string | null; trackIds: string[] }[];
  rows: FinalRow[];
}

/** Selaras ALL_TRACKS di @iw3h/db (konteks peringkat semua finalis). */
const ALL = "all";
const NONE = "__none__";
/** Poll rekap tiap 10 detik selama tab terlihat — cukup "live" saat demo day tanpa
 *  membebani DB (±8 query ringan per poll, ±10 finalis). */
const POLL_MS = 10_000;

const fmt = (n: number | undefined | null, digits = 2) =>
  n === undefined || n === null ? "—" : n.toFixed(digits);

export default function JudgingBoard({
  initial,
  tracks,
  frozen,
  phase,
}: {
  initial: Board;
  tracks: { id: string; name: string }[];
  /** Hackathon completed → nilai panitia tak bisa diubah. */
  frozen: boolean;
  phase: string;
}) {
  const [board, setBoard] = useState<Board>(initial);
  const [track, setTrack] = useState(ALL);
  const [view, setView] = useState<"rekap" | "scoreboard">("rekap");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);
  // Satu fetch berjalan sekaligus. Kalau reload diminta saat fetch berjalan (mis. setelah
  // simpan nilai panitia di tengah poll), fetch diulang sekali lagi supaya data terbaru masuk.
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const reload = useCallback(async (): Promise<void> => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const run = (async () => {
      do {
        again.current = false;
        try {
          const res = await fetch("/api/admin/judging", { cache: "no-store" });
          if (!res.ok) throw new Error(String(res.status));
          setBoard(await res.json());
          setUpdatedAt(new Date());
          setStale(false);
        } catch {
          setStale(true); // tetap tampilkan data terakhir; tandai basi
        }
      } while (again.current);
    })();
    inflight.current = run;
    try {
      await run;
    } finally {
      inflight.current = null;
    }
  }, []);

  useEffect(() => {
    setUpdatedAt(new Date());
    const tick = () => {
      if (document.visibilityState === "visible") reload();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [reload]);

  const trackName = useCallback(
    (id: string) => tracks.find((t) => t.id === id)?.name ?? id,
    [tracks]
  );

  const rows = useMemo(() => {
    const inCtx = board.rows.filter((r) => track === ALL || r.trackIds.includes(track));
    return inCtx.sort(
      (a, b) =>
        (a.ranks[track]?.rank ?? Number.POSITIVE_INFINITY) -
          (b.ranks[track]?.rank ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name)
    );
  }, [board.rows, track]);

  const stats = useMemo(
    () => ({
      finalists: board.rows.length,
      complete: board.rows.filter((r) => r.complete && r.judgesIn >= r.judgesEligible).length,
      judges: board.judges.length,
      ties: board.rows.filter((r) => r.ranks[ALL]?.tie).length,
    }),
    [board]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["rekap", "Recap"],
            ["scoreboard", "Scoreboard"],
          ] as const
        ).map(([k, label]) => (
          <Button
            key={k}
            size="sm"
            variant={view === k ? "default" : "outline"}
            onClick={() => setView(k)}
          >
            {label}
          </Button>
        ))}
        <Select value={track} onValueChange={setTrack}>
          <SelectTrigger size="sm" className="w-44" aria-label="Track filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All finalists</SelectItem>
            {tracks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-theme-xs tabular-nums",
              stale ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
            )}
            aria-live="polite"
          >
            {stale ? "Connection lost — showing last data · " : "Live · "}
            {updatedAt ? `updated ${updatedAt.toLocaleTimeString()}` : ""}
          </span>
          <Button size="icon-sm" variant="ghost" onClick={reload} aria-label="Refresh now">
            <RefreshCw />
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={`/api/admin/judging/export${track === ALL ? "" : `?track=${encodeURIComponent(track)}`}`}
              download
            >
              <Download className="size-4" />
              CSV
            </a>
          </Button>
        </div>
      </div>

      {phase !== "judging" && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Judges can only submit scores while the hackathon phase is “judging” (current: {phase}).
          Mark finalists with the Demo Day star on the Projects page.
        </p>
      )}

      {view === "rekap" ? (
        <RecapTable
          rows={rows}
          criteria={board.criteria}
          ctx={track}
          frozen={frozen}
          trackName={trackName}
          stats={stats}
          onChanged={reload}
        />
      ) : (
        <Scoreboard
          rows={rows}
          ctx={track}
          title={track === ALL ? "All finalists" : trackName(track)}
        />
      )}
    </div>
  );
}

function RankCell({ rank, tie }: { rank: number | null | undefined; tie?: boolean }) {
  if (rank === null || rank === undefined) return <span className="text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      {rank}
      {tie && (
        <Badge variant="destructive" title="Tied after all tie-breakers — judges deliberate">
          TIE
        </Badge>
      )}
    </span>
  );
}

function RecapTable({
  rows,
  criteria,
  ctx,
  frozen,
  trackName,
  stats,
  onChanged,
}: {
  rows: FinalRow[];
  criteria: FinalCriterion[];
  ctx: string;
  frozen: boolean;
  trackName: (id: string) => string;
  stats: { finalists: number; complete: number; judges: number; ties: number };
  onChanged: () => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Final judging recap</CardTitle>
        <CardDescription>
          {stats.finalists} finalists · {stats.complete} fully scored · {stats.judges} judges
          {stats.ties > 0 ? ` · ${stats.ties} tied` : ""}. Final = Σ(criterion × weight) / Σ weight
          on a 1–5 scale; judge criteria use the average of all judges. Ties are broken by the
          highest-weight criterion, then the next. Confidential — never share with teams.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {criteria.length === 0 && (
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
            No scoring criteria configured yet — set them on the Configuration page.
          </p>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Tracks</TableHead>
                <TableHead className="text-right">Final</TableHead>
                {criteria.map((c) => (
                  <TableHead
                    key={c.id}
                    className="min-w-20 text-right"
                    title={c.description ?? undefined}
                  >
                    <span className="block leading-tight">{c.name}</span>
                    <span className="text-theme-xs font-normal text-gray-400">
                      w{c.weight}
                      {c.filledBy === "organizer" ? " · organizer" : ""}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-right">Judges in</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7 + criteria.length}
                    className="py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No finalists yet. Mark the demo day finalists (star) on the Projects page.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const missing = r.judgesIn < r.judgesEligible;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <RankCell rank={r.ranks[ctx]?.rank} tie={r.ranks[ctx]?.tie} />
                    </TableCell>
                    <TableCell className="max-w-56">
                      <p className="truncate font-medium text-gray-800 dark:text-white/90">
                        {r.name}
                      </p>
                      <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {r.teamName ?? "Solo"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.trackIds.map((id) => (
                          <Badge key={id} variant="secondary">
                            {trackName(id)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmt(r.score, 3)}
                    </TableCell>
                    {criteria.map((c) =>
                      c.filledBy === "organizer" ? (
                        <TableCell key={c.id} className="text-right">
                          <OrganizerScore
                            projectId={r.id}
                            criterion={c}
                            value={r.values[c.id]}
                            disabled={frozen}
                            onChanged={onChanged}
                          />
                        </TableCell>
                      ) : (
                        <TableCell
                          key={c.id}
                          className="text-right tabular-nums"
                          title={`${r.judgeCounts[c.id] ?? 0} judge(s)`}
                        >
                          {fmt(r.values[c.id])}
                        </TableCell>
                      )
                    )}
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        missing && "font-semibold text-red-600 dark:text-red-400"
                      )}
                      title={
                        r.pendingJudges.length
                          ? `Waiting for: ${r.pendingJudges.map((j) => j.name ?? short(j.address)).join(", ")}`
                          : undefined
                      }
                    >
                      {r.judgesIn}/{r.judgesEligible}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!r.complete && <Badge variant="outline">Incomplete</Badge>}
                        {r.ranks[ctx]?.tie && <Badge variant="destructive">Tie</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <NotesDialog row={r} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function OrganizerScore({
  projectId,
  criterion,
  value,
  disabled,
  onChanged,
}: {
  projectId: string;
  criterion: FinalCriterion;
  value: number | undefined;
  disabled: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  // Nilai optimistis sampai rekap berikutnya masuk (poll bisa datang di tengah simpan).
  const [pending, setPending] = useState<string | null>(null);
  const current = pending ?? (value === undefined ? NONE : String(value));

  async function change(next: string) {
    setPending(next);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/judging/organizer-score", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          criterionId: criterion.id,
          score: next === NONE ? null : Number(next),
        }),
      });
      if (!res.ok) toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    } catch {
      toast.error("Network error");
    }
    await onChanged();
    setPending(null);
    setBusy(false);
  }

  return (
    <Select value={current} onValueChange={change} disabled={disabled || busy}>
      <SelectTrigger size="sm" className="ml-auto w-16" aria-label={`${criterion.name} score`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>—</SelectItem>
        {[1, 2, 3, 4, 5].map((n) => (
          <SelectItem key={n} value={String(n)}>
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NotesDialog({ row }: { row: FinalRow }) {
  if (row.notes.length === 0) return <span className="text-theme-xs text-gray-400">—</span>;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="xs" variant="outline">
          <MessageSquareText />
          {row.notes.length}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Judge notes — {row.name}</DialogTitle>
          <DialogDescription>
            “For the team” notes may be shared after the event. Internal notes stay with organizers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {row.notes.map((n) => (
            <div
              key={n.judgeAddress}
              className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                {n.judgeName ?? short(n.judgeAddress)}
              </p>
              {n.teamNote && (
                <div className="mt-2">
                  <p className="text-theme-xs uppercase tracking-wide text-gray-400">
                    For the team
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-white/90">
                    {n.teamNote}
                  </p>
                </div>
              )}
              {n.internalNote && (
                <div className="mt-2">
                  <p className="text-theme-xs uppercase tracking-wide text-gray-400">Internal</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-white/90">
                    {n.internalNote}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Scoreboard({ rows, ctx, title }: { rows: FinalRow[]; ctx: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950 [&:fullscreen]:overflow-y-auto [&:fullscreen]:p-12"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-theme-xs uppercase tracking-[0.2em] text-gray-400">Scoreboard</p>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{title}</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => ref.current?.requestFullscreen?.().catch(() => undefined)}
        >
          <Maximize2 className="size-4" />
          Fullscreen
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-gray-500 dark:text-gray-400">No finalists yet.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => {
            const rk = r.ranks[ctx];
            return (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-6 rounded-xl border border-gray-200 px-5 py-4 dark:border-gray-800",
                  rk?.rank === 1 &&
                    "border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10"
                )}
              >
                <span className="w-14 text-4xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                  {rk?.rank ?? "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-2xl font-semibold text-gray-800 dark:text-white/90">
                    {r.name}
                  </p>
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {r.teamName ?? "Solo"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-4xl font-bold tabular-nums text-gray-800 dark:text-white/90">
                    {fmt(r.score, 3)}
                  </span>
                  <span className="flex gap-1">
                    {rk?.tie && <Badge variant="destructive">TIE</Badge>}
                    {!r.complete && <Badge variant="outline">Incomplete</Badge>}
                    <Badge
                      variant={r.judgesIn < r.judgesEligible ? "destructive" : "secondary"}
                      className="tabular-nums"
                    >
                      Judges {r.judgesIn}/{r.judgesEligible}
                    </Badge>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

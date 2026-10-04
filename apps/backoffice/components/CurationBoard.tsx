"use client";

// Hanya TIPE dari @iw3h/db — import nilai akan menyeret drizzle/node:crypto ke bundle client.
import type { ContactStatus, CurationOrg, CurationRow, FinalistSlot } from "@iw3h/db";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ProjectDetails from "./ProjectDetails";

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  weight: number;
}

const ORGS: { value: CurationOrg; label: string }[] = [
  { value: "binance-academy", label: "Binance Academy" },
  { value: "coinvestasi", label: "Coinvestasi" },
  { value: "devweb3jogja", label: "DevWeb3Jogja" },
];
const orgLabel = (v: string) => ORGS.find((o) => o.value === v)?.label ?? v;

const REASONS: { value: string; label: string }[] = [
  { value: "demo_broken", label: "Demo doesn't work" },
  { value: "repo_inaccessible", label: "Repo inaccessible" },
  { value: "video_missing", label: "Video missing / invalid" },
  { value: "off_track", label: "Off track / theme" },
  { value: "duplicate", label: "Duplicate / plagiarism" },
  { value: "other", label: "Other" },
];
const reasonLabel = (v: string | null) => REASONS.find((r) => r.value === v)?.label ?? v ?? "";

const CONTACT: { value: ContactStatus; label: string }[] = [
  { value: "pending", label: "Not contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined", label: "Declined" },
];
const QUOTA: Record<FinalistSlot, number> = { main: 10, reserve: 5 };
const NONE = "__none__";
const ALL = "__all__";

type Tab = "screen" | "score" | "rank";

async function send(url: string, body: unknown): Promise<boolean> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    return false;
  }
  return true;
}

export default function CurationBoard({
  isAdmin,
  organization,
  open,
  criteria,
  rows,
  tracks,
}: {
  isAdmin: boolean;
  organization: CurationOrg | null;
  open: boolean;
  criteria: Criterion[];
  rows: CurationRow[];
  tracks: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState<Tab>("screen");
  const [q, setQ] = useState("");
  const [track, setTrack] = useState(ALL);
  const [screenFilter, setScreenFilter] = useState<"pending" | "pass" | "fail" | typeof ALL>(
    "pending"
  );
  const canAct = open && organization !== null;

  const stats = useMemo(() => {
    const active = (slot: FinalistSlot) =>
      rows.filter((r) => r.finalist?.slot === slot && r.finalist.contactStatus !== "declined")
        .length;
    return {
      total: rows.length,
      pending: rows.filter((r) => !r.screen).length,
      pass: rows.filter((r) => r.screen?.decision === "pass").length,
      fail: rows.filter((r) => r.screen?.decision === "fail").length,
      scored: rows.filter((r) => r.reviews.length > 0).length,
      main: active("main"),
      reserve: active("reserve"),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!needle ||
          r.name.toLowerCase().includes(needle) ||
          (r.teamName ?? "").toLowerCase().includes(needle)) &&
        (track === ALL || r.trackIds.includes(track))
    );
  }, [rows, q, track]);

  const trackName = (id: string) => tracks.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <ReviewerCard organization={organization} />

      {!open && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Curation opens after the submission deadline (and closes when the hackathon is completed).
          You can browse, but not screen or score yet.
        </p>
      )}
      {criteria.length === 0 && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          No scoring criteria configured yet — an admin must set them on the Configuration page.
        </p>
      )}

      <div
        className={cn("grid gap-4 sm:grid-cols-2", isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4")}
      >
        <Stat label="Submitted" value={stats.total} />
        <Stat label="Not screened" value={stats.pending} />
        <Stat label="Passed / failed" value={`${stats.pass} / ${stats.fail}`} />
        <Stat label="Scored (≥1 reviewer)" value={stats.scored} />
        {isAdmin && (
          <Stat
            label="Finalists · reserves"
            value={`${stats.main}/${QUOTA.main} · ${stats.reserve}/${QUOTA.reserve}`}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["screen", "1 · Screening"],
            ["score", "2 · Scoring"],
            ["rank", "3 · Ranking"],
          ] as const
        ).map(([k, label]) => (
          <Button
            key={k}
            size="sm"
            variant={tab === k ? "default" : "outline"}
            onClick={() => setTab(k)}
          >
            {label}
          </Button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search project / team…"
            className="h-8 w-56"
          />
          <Select value={track} onValueChange={setTrack}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tracks</SelectItem>
              {tracks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button asChild size="sm" variant="outline">
              <a href="/api/curation/export" download>
                <Download className="size-4" />
                CSV
              </a>
            </Button>
          )}
        </div>
      </div>

      {tab === "screen" && (
        <ScreeningTable
          rows={filtered.filter((r) =>
            screenFilter === ALL
              ? true
              : screenFilter === "pending"
                ? !r.screen
                : r.screen?.decision === screenFilter
          )}
          filter={screenFilter}
          setFilter={setScreenFilter}
          canAct={canAct}
          trackName={trackName}
        />
      )}
      {tab === "score" && (
        <ScoringTable
          rows={filtered.filter((r) => r.screen?.decision === "pass")}
          criteria={criteria}
          canAct={canAct && criteria.length > 0}
          trackName={trackName}
        />
      )}
      {tab === "rank" && (
        <RankingTable
          rows={filtered.filter((r) => r.screen?.decision === "pass" || r.finalist)}
          criteria={criteria}
          isAdmin={isAdmin}
          canAct={open}
          trackName={trackName}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ReviewerCard({ organization }: { organization: CurationOrg | null }) {
  const router = useRouter();
  const [value, setValue] = useState<string>(organization ?? NONE);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const ok = await send("/api/curation/reviewer", { organization: value });
    setBusy(false);
    if (ok) {
      toast.success("Organization saved");
      router.refresh();
    }
  }

  return (
    <Card className={cn(!organization && "border-brand-300 dark:border-brand-500/40")}>
      <CardHeader>
        <CardTitle>Your organization</CardTitle>
        <CardDescription>
          Recorded with your wallet on every screening & score. Required before you can review.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Select value={value} onValueChange={setValue} disabled={busy}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Choose organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE} disabled>
              Choose organization
            </SelectItem>
            {ORGS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={save} disabled={busy || value === NONE || value === organization}>
          {busy ? "…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProjectCell({ r }: { r: CurationRow }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-gray-800 dark:text-white/90">{r.name}</p>
      <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
        {r.teamName ?? "Solo"}
      </p>
    </div>
  );
}

function Tracks({ ids, trackName }: { ids: string[]; trackName: (id: string) => string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <Badge key={id} variant="secondary">
          {trackName(id)}
        </Badge>
      ))}
    </div>
  );
}

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-8 text-center text-gray-500 dark:text-gray-400">
        {text}
      </TableCell>
    </TableRow>
  );
}

// ── 1 · Screening ────────────────────────────────────────────────────────────

function ScreeningTable({
  rows,
  filter,
  setFilter,
  canAct,
  trackName,
}: {
  rows: CurationRow[];
  filter: string;
  setFilter: (v: "pending" | "pass" | "fail" | typeof ALL) => void;
  canAct: boolean;
  trackName: (id: string) => string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Screening — pass / fail</CardTitle>
          <CardDescription>
            Quick eligibility check. One decision per project; the latest one wins (full history in
            the audit log).
          </CardDescription>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter & "pending")}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Not screened</SelectItem>
            <SelectItem value="pass">Passed</SelectItem>
            <SelectItem value="fail">Failed</SelectItem>
            <SelectItem value={ALL}>All</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Tracks</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <Empty cols={4} text="Nothing here." />}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-64">
                  <ProjectCell r={r} />
                </TableCell>
                <TableCell>
                  <Tracks ids={r.trackIds} trackName={trackName} />
                </TableCell>
                <TableCell>
                  {r.screen ? (
                    <div className="space-y-0.5">
                      <Badge variant={r.screen.decision === "pass" ? "default" : "destructive"}>
                        {r.screen.decision === "pass"
                          ? "Passed"
                          : `Failed · ${reasonLabel(r.screen.reason)}`}
                      </Badge>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                        by {orgLabel(r.screen.organization)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-theme-xs text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {/* Saring HANYA dari dalam detail: penilai wajib membaca submission dulu. */}
                    <ProjectDetails
                      id={r.id}
                      name={r.name}
                      endpoint={`/api/curation/projects/${r.id}`}
                      trackName={trackName}
                      trigger={r.screen ? "Review · change" : "Review"}
                      footer={(close) => <ScreenForm row={r} disabled={!canAct} onDone={close} />}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ScreenForm({
  row,
  disabled,
  onDone,
}: {
  row: CurationRow;
  disabled: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"pass" | "fail" | null>(row.screen?.decision ?? null);
  const [reason, setReason] = useState(row.screen?.reason ?? "demo_broken");
  const [note, setNote] = useState(row.screen?.note ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!decision) return;
    setBusy(true);
    const ok = await send("/api/curation/screen", {
      projectId: row.id,
      decision,
      reason: decision === "fail" ? reason : null,
      note: note.trim() || null,
    });
    setBusy(false);
    if (ok) {
      toast.success(decision === "pass" ? "Marked as passed" : "Marked as failed");
      onDone();
      router.refresh();
    }
  }

  if (disabled) {
    return <ClosedNote />;
  }
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Screening decision
        </h3>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {row.screen
            ? `Current: ${row.screen.decision === "pass" ? "Passed" : `Failed · ${reasonLabel(row.screen.reason)}`} (by ${orgLabel(row.screen.organization)})`
            : "Does this submission pass the eligibility check?"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant={decision === "pass" ? "default" : "outline"}
          onClick={() => setDecision("pass")}
        >
          Pass
        </Button>
        <Button
          className="flex-1"
          variant={decision === "fail" ? "destructive" : "outline"}
          onClick={() => setDecision("fail")}
        >
          Fail
        </Button>
      </div>
      {decision === "fail" && (
        <div className="grid gap-1.5">
          <Label>Reason</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label>Note (optional, internal)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy || !decision}>
          {busy ? "…" : "Save decision"}
        </Button>
      </div>
    </div>
  );
}

function ClosedNote() {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Read-only — curation is closed or your organization isn't set yet.
    </p>
  );
}

// ── 2 · Scoring ──────────────────────────────────────────────────────────────

function ScoringTable({
  rows,
  criteria,
  canAct,
  trackName,
}: {
  rows: CurationRow[];
  criteria: Criterion[];
  canAct: boolean;
  trackName: (id: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoring — passed projects</CardTitle>
        <CardDescription>
          Score every criterion 1–5. Aim for at least 2 reviewers per project. You only see and edit
          your own scores here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Tracks</TableHead>
              <TableHead className="text-right">Reviewers</TableHead>
              <TableHead>You</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <Empty cols={5} text="No passed projects yet." />}
            {rows.map((r) => {
              const mine = Object.keys(r.myScores).length > 0;
              return (
                <TableRow key={r.id}>
                  <TableCell className="max-w-64">
                    <ProjectCell r={r} />
                  </TableCell>
                  <TableCell>
                    <Tracks ids={r.trackIds} trackName={trackName} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={cn(r.reviews.length < 2 && "font-semibold text-amber-600")}
                      title={r.reviews.map((v) => orgLabel(v.organization)).join(", ")}
                    >
                      {r.reviews.length}
                    </span>
                  </TableCell>
                  <TableCell>
                    {mine ? (
                      <Badge>Scored</Badge>
                    ) : (
                      <span className="text-theme-xs text-gray-400">Not yet</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* Nilai HANYA dari dalam detail, sama seperti saring. */}
                      <ProjectDetails
                        id={r.id}
                        name={r.name}
                        endpoint={`/api/curation/projects/${r.id}`}
                        trackName={trackName}
                        trigger={mine ? "Review · edit score" : "Review & score"}
                        footer={(close) => (
                          <ScoreForm
                            row={r}
                            criteria={criteria}
                            disabled={!canAct}
                            onDone={close}
                          />
                        )}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ScoreForm({
  row,
  criteria,
  disabled,
  onDone,
}: {
  row: CurationRow;
  criteria: Criterion[];
  disabled: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, number>>(row.myScores);
  const [note, setNote] = useState(row.myNote ?? "");
  const [busy, setBusy] = useState(false);
  const totalWeight = criteria.reduce((a, c) => a + c.weight, 0) || 1;
  const complete = criteria.every((c) => vals[c.id] >= 1);

  async function save() {
    setBusy(true);
    const ok = await send("/api/curation/review", {
      projectId: row.id,
      entries: criteria.map((c) => ({ criterionId: c.id, score: vals[c.id] })),
      note: note.trim() || null,
    });
    setBusy(false);
    if (ok) {
      toast.success("Scores saved");
      onDone();
      router.refresh();
    }
  }

  if (disabled) {
    return <ClosedNote />;
  }
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Your score</h3>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          1 = very weak · 3 = adequate · 5 = excellent
        </p>
      </div>
      {criteria.map((c) => (
        <div key={c.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {c.name}{" "}
              <span className="text-theme-xs font-normal text-gray-500">
                · {Math.round((c.weight / totalWeight) * 100)}%
              </span>
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  size="icon-xs"
                  variant={vals[c.id] === n ? "default" : "outline"}
                  onClick={() => setVals((v) => ({ ...v, [c.id]: n }))}
                  aria-label={`${c.name}: ${n}`}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          {c.description && (
            <p className="mt-1.5 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {c.description}
            </p>
          )}
        </div>
      ))}
      <div className="grid gap-1.5">
        <Label>Note (optional, internal)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
      </div>
      <div className="flex items-center justify-end gap-3">
        {!complete && <span className="text-theme-xs text-gray-500">Score every criterion.</span>}
        <Button onClick={save} disabled={busy || !complete}>
          {busy ? "…" : "Save scores"}
        </Button>
      </div>
    </div>
  );
}

// ── 3 · Ranking + shortlist ──────────────────────────────────────────────────

function RankingTable({
  rows,
  criteria,
  isAdmin,
  canAct,
  trackName,
}: {
  rows: CurationRow[];
  criteria: Criterion[];
  isAdmin: boolean;
  canAct: boolean;
  trackName: (id: string) => string;
}) {
  const ranked = [...rows].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name)
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking</CardTitle>
        <CardDescription>
          Weighted average of all reviewers (1–5). Filter by track to balance finalists across
          tracks.
          {isAdmin
            ? " Pick 10 finalists + 5 reserves; declined teams free their slot."
            : " Only admins manage the shortlist."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Tracks</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Reviewers</TableHead>
              {isAdmin && <TableHead>Shortlist</TableHead>}
              {isAdmin && <TableHead>Contact</TableHead>}
              {isAdmin && <TableHead>Note</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.length === 0 && <Empty cols={isAdmin ? 8 : 5} text="No scores yet." />}
            {ranked.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="tabular-nums">{r.score === null ? "—" : i + 1}</TableCell>
                <TableCell className="max-w-64">
                  <ProjectCell r={r} />
                </TableCell>
                <TableCell>
                  <Tracks ids={r.trackIds} trackName={trackName} />
                </TableCell>
                <TableCell
                  className="text-right tabular-nums"
                  title={criteria
                    .map((c) =>
                      r.criterionAvg[c.id] === undefined
                        ? null
                        : `${c.name}: ${r.criterionAvg[c.id].toFixed(2)}`
                    )
                    .filter(Boolean)
                    .join("\n")}
                >
                  {r.score === null ? "—" : r.score.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.reviews.length}</TableCell>
                {isAdmin && <FinalistCells row={r} disabled={!canAct} />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FinalistCells({ row, disabled }: { row: CurationRow; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(row.finalist?.note ?? "");

  async function update(patch: {
    slot: FinalistSlot | null;
    contactStatus?: ContactStatus;
    note?: string | null;
  }) {
    setBusy(true);
    const ok = await send("/api/curation/finalists", { projectId: row.id, ...patch });
    setBusy(false);
    if (ok) router.refresh();
    return ok;
  }

  const slot = row.finalist?.slot ?? null;
  return (
    <>
      <TableCell>
        <Select
          value={slot ?? NONE}
          disabled={disabled || busy}
          onValueChange={(v) => update({ slot: v === NONE ? null : (v as FinalistSlot) })}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            <SelectItem value="main">Finalist</SelectItem>
            <SelectItem value="reserve">Reserve</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={row.finalist?.contactStatus ?? "pending"}
          disabled={disabled || busy || !slot}
          onValueChange={(v) => slot && update({ slot, contactStatus: v as ContactStatus })}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={note}
          disabled={disabled || busy || !slot}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (slot && note.trim() !== (row.finalist?.note ?? "")) {
              update({ slot, note: note.trim() || null });
            }
          }}
          maxLength={1000}
          placeholder="e.g. tracks / prize notes"
          className="h-8 w-48"
        />
      </TableCell>
    </>
  );
}

"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Row {
  id: string;
  name: string;
  votes: number;
}

export default function VotingControl({
  votingOpen,
  leaderboardPublic,
  leaderboard,
  voteUrl,
}: {
  votingOpen: boolean;
  leaderboardPublic: boolean;
  leaderboard: Row[];
  voteUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const total = leaderboard.reduce((s, r) => s + r.votes, 0);
  const max = Math.max(1, ...leaderboard.map((r) => r.votes));

  async function patch(body: Record<string, boolean>, msg: string) {
    setBusy(true);
    const res = await fetch("/api/admin/vote-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(msg);
      router.refresh();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    }
  }

  async function resetDemo() {
    if (!window.confirm("Kosongkan semua vote di edisi DEMO? (edisi asli tidak tersentuh)")) return;
    setBusy(true);
    const res = await fetch("/api/admin/vote-demo/reset", { method: "POST" });
    setBusy(false);
    if (res.ok) toast.success("Vote demo di-reset");
    else toast.error((await res.json().catch(() => null))?.error ?? "Failed");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Toggle
          label="Voting"
          on={votingOpen}
          onLabel="Dibuka"
          offLabel="Ditutup"
          hint="Saat dibuka, peserta & juri bisa masuk halaman vote (demo day)."
          busy={busy}
          onToggle={() =>
            patch({ votingOpen: !votingOpen }, votingOpen ? "Voting ditutup" : "Voting dibuka")
          }
        />
        <Toggle
          label="Leaderboard publik"
          on={leaderboardPublic}
          onLabel="Publik"
          offLabel="Admin saja"
          hint="Kalau publik, semua pemilih lihat ranking. Kalau tidak, hanya admin."
          busy={busy}
          onToggle={() =>
            patch(
              { leaderboardPublic: !leaderboardPublic },
              leaderboardPublic ? "Leaderboard disembunyikan" : "Leaderboard dipublikasikan"
            )
          }
        />
      </div>

      <div className="rounded-xl border border-dashed border-brand-400/60 bg-brand-50/40 p-4 dark:border-brand-500/40 dark:bg-brand-500/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              Demo voting (dry-run)
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Finalis mock + vote real, terpisah total dari edisi asli. Hanya admin yang bisa buka.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="default">
              <a href={`${voteUrl}/?demo=1`} target="_blank" rel="noopener noreferrer">
                Buka demo
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={resetDemo} disabled={busy}>
              Reset vote demo
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Leaderboard <span className="text-gray-400">· {total} vote</span>
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => router.refresh()} title="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={voteUrl} target="_blank" rel="noopener noreferrer">
              Buka situs vote
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Belum ada finalis. Tandai project sebagai finalis di halaman Projects (ikon bintang).
        </p>
      ) : (
        <ol className="space-y-2">
          {leaderboard.map((r, i) => (
            <li key={r.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 text-center font-bold tabular-nums text-gray-400">
                    {i + 1}
                  </span>
                  <span className="truncate font-medium text-gray-800 dark:text-white/90">
                    {r.name}
                  </span>
                  {i === 0 && r.votes > 0 ? <Badge>Teratas</Badge> : null}
                </span>
                <span className="shrink-0 font-bold tabular-nums">{r.votes}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${(r.votes / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Toggle({
  label,
  on,
  onLabel,
  offLabel,
  hint,
  busy,
  onToggle,
}: {
  label: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
  hint: string;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</span>
          <Badge variant={on ? "default" : "secondary"}>{on ? onLabel : offLabel}</Badge>
        </div>
        <Button size="sm" variant={on ? "outline" : "default"} onClick={onToggle} disabled={busy}>
          {on ? "Tutup" : "Buka"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  );
}

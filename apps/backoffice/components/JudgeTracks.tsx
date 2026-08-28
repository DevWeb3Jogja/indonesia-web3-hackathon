"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Track {
  id: string;
  name: string;
}

export default function JudgeTracks({
  judgeAddress,
  tracks,
  assigned,
}: {
  judgeAddress: string;
  tracks: Track[];
  assigned: string[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>(assigned);
  const [busy, setBusy] = useState(false);

  async function toggle(id: string) {
    const next = sel.includes(id) ? sel.filter((t) => t !== id) : [...sel, id];
    const prev = sel;
    setSel(next);
    setBusy(true);
    const res = await fetch("/api/admin/judge-tracks", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ judgeAddress, trackIds: next }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else {
      setSel(prev);
      toast.error((await res.json().catch(() => null))?.error ?? "Gagal");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tracks.map((t) => (
        <Button
          key={t.id}
          type="button"
          size="xs"
          variant={sel.includes(t.id) ? "default" : "outline"}
          onClick={() => toggle(t.id)}
          disabled={busy}
        >
          {t.name}
        </Button>
      ))}
      {sel.length === 0 && (
        <span className="text-xs text-muted-foreground italic">semua track</span>
      )}
    </div>
  );
}

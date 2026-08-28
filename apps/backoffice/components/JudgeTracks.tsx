"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      setSel(sel);
      alert((await res.json().catch(() => null))?.error ?? "Gagal");
    }
  }

  return (
    <span className="tracks">
      {tracks.map((t) => (
        <label key={t.id} className="chip">
          <input
            type="checkbox"
            checked={sel.includes(t.id)}
            onChange={() => toggle(t.id)}
            disabled={busy}
          />
          {t.name}
        </label>
      ))}
      {sel.length === 0 && <span className="all">semua track</span>}
    </span>
  );
}

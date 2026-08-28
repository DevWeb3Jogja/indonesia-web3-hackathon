"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Option {
  projectId: string;
  name: string;
  avgScore: number;
}

export default function WinnerPicker({
  prizeId,
  current,
  options,
}: {
  prizeId: string;
  current: string | null;
  options: Option[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setBusy(true);
    const res = await fetch("/api/admin/winners", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prizeId, projectId: next || null }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else {
      setValue(prev);
      alert((await res.json().catch(() => null))?.error ?? "Gagal");
    }
  }

  return (
    <select value={value} onChange={(e) => change(e.target.value)} disabled={busy}>
      <option value="">— belum ada —</option>
      {options.map((o) => (
        <option key={o.projectId} value={o.projectId}>
          {o.name} ({o.avgScore.toFixed(1)})
        </option>
      ))}
    </select>
  );
}

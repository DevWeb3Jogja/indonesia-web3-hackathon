"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PHASES = ["draft", "registration", "submission", "judging", "completed"] as const;

export default function PhaseControl({ current }: { current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/phase", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Tersimpan.");
      router.refresh();
    } else {
      setMsg((await res.json().catch(() => null))?.error ?? "Gagal");
    }
  }

  return (
    <div className="phase">
      <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}>
        {PHASES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button type="button" onClick={save} disabled={busy || status === current}>
        {busy ? "…" : "Ubah fase"}
      </button>
      {msg && <span className="note">{msg}</span>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FIELDS: { key: string; label: string; type: "text" | "number" }[] = [
  { key: "name", label: "Nama", type: "text" },
  { key: "year", label: "Tahun", type: "number" },
  { key: "registrationOpensAt", label: "Registrasi buka", type: "text" },
  { key: "registrationClosesAt", label: "Registrasi tutup", type: "text" },
  { key: "submissionOpensAt", label: "Submission buka", type: "text" },
  { key: "submissionClosesAt", label: "Submission tutup", type: "text" },
  { key: "judgingClosesAt", label: "Penjurian tutup", type: "text" },
  { key: "winnersAnnouncedAt", label: "Pengumuman pemenang", type: "text" },
];

export default function HackathonSettings({ current }: { current: Record<string, unknown> }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(
      FIELDS.map((f) => [f.key, current[f.key] == null ? "" : String(current[f.key])])
    )
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const body: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const raw = vals[f.key];
      if (f.type === "number") {
        if (raw !== "") body[f.key] = Number(raw);
      } else {
        body[f.key] = raw === "" ? null : raw;
      }
    }
    const res = await fetch("/api/admin/hackathon", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
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
    <section className="settings">
      <p className="hint">
        Deadline: format bebas — tanggal (2026-10-01) atau ISO. Kosong = tanpa deadline.
      </p>
      <div className="grid">
        {FIELDS.map((f) => (
          <label key={f.key}>
            <span>{f.label}</span>
            <input
              type={f.type === "number" ? "number" : "text"}
              value={vals[f.key]}
              onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
              disabled={busy}
            />
          </label>
        ))}
      </div>
      <button type="button" onClick={save} disabled={busy}>
        {busy ? "…" : "Simpan setting"}
      </button>
      {msg && <span className="note">{msg}</span>}
    </section>
  );
}

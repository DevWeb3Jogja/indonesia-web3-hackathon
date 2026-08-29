"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS: { key: string; label: string; type: "text" | "number" | "date" }[] = [
  { key: "name", label: "Nama", type: "text" },
  { key: "year", label: "Tahun", type: "number" },
  { key: "registrationOpensAt", label: "Registrasi buka", type: "date" },
  { key: "registrationClosesAt", label: "Registrasi tutup", type: "date" },
  { key: "submissionOpensAt", label: "Submission buka", type: "date" },
  { key: "submissionClosesAt", label: "Submission tutup", type: "date" },
  { key: "judgingClosesAt", label: "Penjurian tutup", type: "date" },
  { key: "winnersAnnouncedAt", label: "Pengumuman pemenang", type: "date" },
];

/** Native <input type=date> butuh "YYYY-MM-DD"; nilai tersimpan bisa ISO penuh. */
function toDateInput(v: unknown): string {
  return v == null ? "" : String(v).slice(0, 10);
}

export default function HackathonSettings({ current }: { current: Record<string, unknown> }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(
      FIELDS.map((f) => [
        f.key,
        f.type === "date"
          ? toDateInput(current[f.key])
          : current[f.key] == null
            ? ""
            : String(current[f.key]),
      ])
    )
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
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
      toast.success("Setting tersimpan");
      router.refresh();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Gagal");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Pilih tanggal lewat date picker. Kosong = tanpa deadline (deadline dihitung akhir hari).
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="grid gap-1.5">
            <Label htmlFor={`hs-${f.key}`} className="text-xs">
              {f.label}
            </Label>
            <Input
              id={`hs-${f.key}`}
              type={f.type}
              className={f.type === "date" ? "[color-scheme:dark]" : undefined}
              value={vals[f.key]}
              onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
              disabled={busy}
            />
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={busy}>
        {busy ? "…" : "Simpan setting"}
      </Button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fromWibInput, toWibInput } from "@/lib/wib";

const FIELDS: { key: string; label: string; type: "text" | "number" | "date" }[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "year", label: "Year", type: "number" },
  { key: "registrationOpensAt", label: "Registration opens", type: "date" },
  { key: "registrationClosesAt", label: "Registration closes", type: "date" },
  { key: "submissionOpensAt", label: "Submission opens", type: "date" },
  { key: "submissionClosesAt", label: "Submission closes", type: "date" },
  { key: "judgingClosesAt", label: "Judging closes", type: "date" },
  { key: "winnersAnnouncedAt", label: "Winners announced", type: "date" },
];

export default function HackathonSettings({ current }: { current: Record<string, unknown> }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(
      FIELDS.map((f) => [
        f.key,
        f.type === "date"
          ? toWibInput(current[f.key], f.key.endsWith("ClosesAt"))
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
      } else if (f.type === "date") {
        body[f.key] = fromWibInput(raw);
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
      toast.success("Settings saved");
      router.refresh();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        All times in WIB (UTC+7). Empty = no deadline.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="grid gap-1.5">
            <Label htmlFor={`hs-${f.key}`} className="text-xs">
              {f.label}
            </Label>
            <Input
              id={`hs-${f.key}`}
              type={f.type === "date" ? "datetime-local" : f.type}
              className={f.type === "date" ? "[color-scheme:dark]" : undefined}
              value={vals[f.key]}
              onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
              disabled={busy}
            />
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={busy}>
        {busy ? "…" : "Save settings"}
      </Button>
    </div>
  );
}

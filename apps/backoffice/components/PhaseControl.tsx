"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PHASES = ["draft", "registration", "submission", "judging", "completed"] as const;

export default function PhaseControl({ current }: { current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/admin/phase", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(`Phase changed to "${status}"`);
      router.refresh();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={status} onValueChange={setStatus} disabled={busy}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PHASES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={save} disabled={busy || status === current}>
        {busy ? "…" : "Change phase"}
      </Button>
    </div>
  );
}

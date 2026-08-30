"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  projectId: string;
  name: string;
  avgScore: number;
}

const NONE = "__none__";

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
  const [value, setValue] = useState(current ?? NONE);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setBusy(true);
    const res = await fetch("/api/admin/winners", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prizeId, projectId: next === NONE ? null : next }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Winners updated");
      router.refresh();
    } else {
      setValue(prev);
      toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    }
  }

  return (
    <Select value={value} onValueChange={change} disabled={busy}>
      <SelectTrigger size="sm" className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— none yet —</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.projectId} value={o.projectId}>
            {o.name} ({o.avgScore.toFixed(1)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

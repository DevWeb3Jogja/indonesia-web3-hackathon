"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Tombol tandai finalis demo day (kandidat vote). Bintang emas = finalis. */
export default function DemoDayToggle({
  id,
  demoDay,
  onChanged,
}: {
  id: string;
  demoDay: boolean;
  onChanged?: () => void;
}) {
  const [on, setOn] = useState(demoDay);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setBusy(true);
    const res = await fetch(`/api/admin/projects/${id}/demo-day`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ demoDay: next }),
    });
    setBusy(false);
    if (res.ok) {
      setOn(next);
      toast.success(next ? "Ditandai finalis demo day" : "Dihapus dari finalis");
      onChanged?.();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    }
  }

  return (
    <Button
      size="icon-xs"
      variant="ghost"
      onClick={toggle}
      disabled={busy}
      title={on ? "Finalis demo day — klik untuk lepas" : "Tandai finalis demo day"}
      aria-pressed={on}
    >
      <Star className={on ? "fill-brand-500 text-brand-500" : "text-gray-400 dark:text-gray-500"} />
    </Button>
  );
}

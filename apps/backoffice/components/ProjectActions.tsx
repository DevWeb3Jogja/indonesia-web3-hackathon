"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ProjectActions({
  id,
  status,
  onChanged,
}: {
  id: string;
  status: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === "disqualified" ? "submitted" : "disqualified";

  async function toggle() {
    if (next === "disqualified" && !window.confirm("Disqualify project ini?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/projects/${id}/status`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(next === "disqualified" ? "Project didiskualifikasi" : "Project dipulihkan");
      onChanged?.();
      router.refresh();
    } else toast.error((await res.json().catch(() => null))?.error ?? "Gagal");
  }

  return (
    <Button
      variant={next === "disqualified" ? "destructive" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={busy}
    >
      {busy ? "…" : next === "disqualified" ? "Disqualify" : "Pulihkan"}
    </Button>
  );
}

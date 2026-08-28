"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    if (next === "disqualified" && !confirm("Disqualify project ini?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/projects/${id}/status`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) {
      onChanged?.();
      router.refresh();
    } else alert((await res.json().catch(() => null))?.error ?? "Gagal");
  }

  return (
    <button
      type="button"
      className={next === "disqualified" ? "danger" : ""}
      onClick={toggle}
      disabled={busy}
    >
      {busy ? "…" : next === "disqualified" ? "Disqualify" : "Pulihkan"}
    </button>
  );
}

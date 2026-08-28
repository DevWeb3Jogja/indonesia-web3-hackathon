"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLES = ["participant", "judge", "admin"] as const;

export default function RoleSelect({
  address,
  role,
  onChanged,
}: {
  address: string;
  role: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setBusy(true);
    const res = await fetch("/api/admin/users/role", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, role: next }),
    });
    setBusy(false);
    if (res.ok) {
      onChanged?.();
      router.refresh();
    } else {
      setValue(prev);
      alert((await res.json().catch(() => null))?.error ?? "Gagal ubah role");
    }
  }

  return (
    <select value={value} onChange={(e) => change(e.target.value)} disabled={busy}>
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}

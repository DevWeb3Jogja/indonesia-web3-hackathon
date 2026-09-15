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

const DEFAULTS = ["participant", "judge", "admin"];
const ADD = "__add__";
const ROLE_RE = /^[a-z][a-z0-9_-]{1,19}$/;

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

  // Defaults + role saat ini (kalau kustom) → tetap tampil di dropdown.
  const options = DEFAULTS.includes(value) ? DEFAULTS : [...DEFAULTS, value];

  async function apply(next: string) {
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
      toast.success(`Role → ${next}`);
      onChanged?.();
      router.refresh();
    } else {
      setValue(prev);
      toast.error((await res.json().catch(() => null))?.error ?? "Failed to change role");
    }
  }

  function onSelect(next: string) {
    if (next === ADD) {
      const raw = window.prompt("Nama role baru (huruf kecil, 2-20 char, mis. panitia):")?.trim();
      if (!raw) return;
      if (!ROLE_RE.test(raw)) {
        toast.error("Format role tidak valid");
        return;
      }
      apply(raw);
      return;
    }
    apply(next);
  }

  return (
    <Select value={value} onValueChange={onSelect} disabled={busy}>
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
        <SelectItem value={ADD} className="text-brand-600 dark:text-brand-400">
          + New role…
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

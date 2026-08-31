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
      toast.success(`Role → ${next}`);
      onChanged?.();
      router.refresh();
    } else {
      setValue(prev);
      toast.error((await res.json().catch(() => null))?.error ?? "Failed to change role");
    }
  }

  return (
    <Select value={value} onValueChange={change} disabled={busy}>
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

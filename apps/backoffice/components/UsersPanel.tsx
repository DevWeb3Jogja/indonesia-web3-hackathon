"use client";

import { Download, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PagedList from "./PagedList";
import RoleSelect from "./RoleSelect";
import UserDetails, { type AdminUser, StageBadge } from "./UserDetails";

const ROLES = ["participant", "judge", "admin"] as const;

export default function UsersPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<string>("participant");
  const [busy, setBusy] = useState(false);

  const validAddr = /^0x[0-9a-fA-F]{40}$/.test(address.trim());

  async function add() {
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: address.trim(), role }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("User added");
      setOpen(false);
      setAddress("");
      setRole("participant");
      setRefreshKey((k) => k + 1);
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <a href="/api/admin/users/export?format=xlsx" download>
            <Download className="size-4" />
            Excel
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href="/api/admin/users/export" download>
            <Download className="size-4" />
            CSV
          </a>
        </Button>
        <Button size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="size-4" />
          Add user
        </Button>
      </div>

      <PagedList<AdminUser>
        key={refreshKey}
        endpoint="/api/admin/users"
        rowKey={(u) => u.address}
        searchPlaceholder="Search address / username / email…"
        filters={[
          {
            key: "role",
            label: "Role",
            options: [
              { value: "participant", label: "participant" },
              { value: "judge", label: "judge" },
              { value: "admin", label: "admin" },
            ],
          },
        ]}
        sorts={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
        ]}
        columns={[
          {
            header: "Name",
            cell: (u) => (
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-gray-800 dark:text-white/90">
                  {u.fullName || u.username || "—"}
                </span>
                {u.username && (
                  <span className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                    @{u.username}
                  </span>
                )}
              </div>
            ),
          },
          {
            header: "Email",
            cell: (u) => u.email ?? <span className="text-gray-400">—</span>,
          },
          { header: "Stage", cell: (u) => <StageBadge stage={u.stage} /> },
          {
            header: "Role",
            cell: (u, reload) => (
              <RoleSelect address={u.address} role={u.role} onChanged={reload} />
            ),
          },
          { header: "", cell: (u) => <UserDetails user={u} /> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Pre-register a wallet (no sign-in needed) and set its role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="au-addr">Wallet address</Label>
              <Input
                id="au-addr"
                placeholder="0x…"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="font-mono"
                spellCheck={false}
              />
              {address.trim() !== "" && !validAddr && (
                <p className="text-red-600 dark:text-red-400 text-[11px]">
                  Invalid wallet address (0x + 40 hex)
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full">
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={add} disabled={busy || !validAddr}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

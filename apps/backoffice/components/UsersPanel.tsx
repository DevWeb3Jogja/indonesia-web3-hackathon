"use client";

import { UserPlus } from "lucide-react";
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

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const ROLES = ["participant", "judge", "admin"] as const;

interface U {
  address: string;
  username: string | null;
  role: string;
}

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
      toast.success("User ditambahkan");
      setOpen(false);
      setAddress("");
      setRole("participant");
      setRefreshKey((k) => k + 1);
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Gagal");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="size-4" />
          Tambah user
        </Button>
      </div>

      <PagedList<U>
        key={refreshKey}
        endpoint="/api/admin/users"
        rowKey={(u) => u.address}
        searchPlaceholder="Cari address / username / email…"
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
          { value: "newest", label: "Terbaru" },
          { value: "oldest", label: "Terlama" },
        ]}
        columns={[
          { header: "Address", cell: (u) => <code>{short(u.address)}</code> },
          { header: "Username", cell: (u) => u.username ?? "—" },
          {
            header: "Role",
            cell: (u, reload) => (
              <RoleSelect address={u.address} role={u.role} onChanged={reload} />
            ),
          },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah user</DialogTitle>
            <DialogDescription>
              Pra-daftar wallet (belum perlu sign-in) dan set role-nya.
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
                <p className="text-destructive text-[11px]">
                  Alamat wallet tidak valid (0x + 40 hex)
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
              Batal
            </Button>
            <Button onClick={add} disabled={busy || !validAddr}>
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

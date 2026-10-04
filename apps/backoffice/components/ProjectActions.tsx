"use client";

import { Ban, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProjectActions({
  id,
  name,
  tagline,
  status,
  onChanged,
}: {
  id: string;
  name: string;
  tagline: string | null;
  status: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name, tagline: tagline ?? "" });
  const next = status === "disqualified" ? "submitted" : "disqualified";

  async function send(method: string, url: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (res.ok) {
      onChanged?.();
      router.refresh();
      return true;
    }
    toast.error((await res.json().catch(() => null))?.error ?? "Failed");
    return false;
  }

  async function toggleStatus() {
    if (next === "disqualified" && !window.confirm("Disqualify this project?")) return;
    if (await send("PUT", `/api/admin/projects/${id}/status`, { status: next })) {
      toast.success(next === "disqualified" ? "Project disqualified" : "Project restored");
    }
  }

  async function save() {
    const ok = await send("PUT", `/api/admin/projects/${id}`, {
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
    });
    if (ok) {
      toast.success("Project saved");
      setEditOpen(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    if (await send("DELETE", `/api/admin/projects/${id}`)) toast.success("Project deleted");
  }

  return (
    <>
      {/* Aksi jarang + berbahaya disimpan di menu ⋯ — tabel 100+ baris tak penuh tombol merah. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost" disabled={busy} aria-label={`Actions for ${name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setForm({ name, tagline: tagline ?? "" });
              setEditOpen(true);
            }}
          >
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleStatus}>
            {next === "disqualified" ? <Ban /> : <RotateCcw />}
            {next === "disqualified" ? "Disqualify" : "Restore"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={remove}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>Edit the project name & tagline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pe-name">Name</Label>
              <Input
                id="pe-name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                maxLength={80}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pe-tagline">Tagline</Label>
              <Input
                id="pe-tagline"
                value={form.tagline}
                onChange={(e) => setForm((s) => ({ ...s, tagline: e.target.value }))}
                maxLength={140}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy || form.name.trim().length < 2}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

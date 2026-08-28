"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}
export interface ConfigRow {
  id: string;
  [k: string]: unknown;
}

const NONE = "__none__";

export default function ConfigEditor({
  endpoint,
  fields,
  items,
}: {
  endpoint: string;
  fields: FieldDef[];
  items: ConfigRow[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editVals, setEditVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function payload(vals: Record<string, string>) {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = vals[f.key];
      if (raw === undefined) continue;
      if (raw === "" || raw === NONE) out[f.key] = f.type === "number" ? undefined : null;
      else out[f.key] = f.type === "number" ? Number(raw) : raw;
    }
    return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
  }

  async function send(method: string, url: string, vals?: Record<string, string>) {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: vals ? { "content-type": "application/json" } : undefined,
      body: vals ? JSON.stringify(payload(vals)) : undefined,
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
      return true;
    }
    toast.error((await res.json().catch(() => null))?.error ?? "Gagal");
    return false;
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus item ini?")) return;
    await send("DELETE", `${endpoint}/${id}`);
  }

  function cell(f: FieldDef, value: string, onChange: (v: string) => void, idPrefix: string) {
    if (f.type === "select") {
      return (
        <Select value={value || NONE} onValueChange={onChange} disabled={busy}>
          <SelectTrigger size="sm" className="w-full min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {f.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        id={`${idPrefix}-${f.key}`}
        type={f.type === "number" ? "number" : "text"}
        value={value}
        placeholder={f.placeholder ?? f.label}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
        className="h-8"
      />
    );
  }

  function fmt(v: unknown, f: FieldDef): string {
    if (v == null || v === "") return "—";
    if (f.type === "select") return f.options?.find((o) => o.value === v)?.label ?? String(v);
    return String(v);
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map((f) => (
              <TableHead key={f.key}>{f.label}</TableHead>
            ))}
            <TableHead className="w-28 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) =>
            editing === it.id ? (
              <TableRow key={it.id} className="bg-muted/40">
                {fields.map((f) => (
                  <TableCell key={f.key}>
                    {cell(
                      f,
                      editVals[f.key] ?? "",
                      (v) => setEditVals((s) => ({ ...s, [f.key]: v })),
                      it.id
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      onClick={() =>
                        send("PUT", `${endpoint}/${it.id}`, editVals).then(
                          (ok) => ok && setEditing(null)
                        )
                      }
                      disabled={busy}
                    >
                      Simpan
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => setEditing(null)}>
                      <X />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={it.id}>
                {fields.map((f) => (
                  <TableCell key={f.key}>{fmt(it[f.key], f)}</TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => {
                        setEditing(it.id);
                        setEditVals(
                          Object.fromEntries(
                            fields.map((f) => [f.key, it[f.key] == null ? "" : String(it[f.key])])
                          )
                        );
                      }}
                      disabled={busy}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => remove(it.id)}
                      disabled={busy}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          )}
          <TableRow className="bg-muted/20">
            {fields.map((f) => (
              <TableCell key={f.key}>
                {cell(f, draft[f.key] ?? "", (v) => setDraft((s) => ({ ...s, [f.key]: v })), "add")}
              </TableCell>
            ))}
            <TableCell className="text-right">
              <Button
                size="sm"
                onClick={async () => {
                  if (await send("POST", endpoint, draft)) setDraft({});
                }}
                disabled={busy}
              >
                <Plus />
                Tambah
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

/** Inline CRUD generik untuk entitas config (tracks/criteria/prizes). */
export default function ConfigEditor({
  title,
  endpoint,
  fields,
  items,
}: {
  title: string;
  endpoint: string;
  fields: FieldDef[];
  items: ConfigRow[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editVals, setEditVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function payload(vals: Record<string, string>) {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = vals[f.key];
      if (raw === undefined) continue;
      if (raw === "") {
        out[f.key] = f.type === "number" ? undefined : null; // kosong = null (kecuali angka)
      } else {
        out[f.key] = f.type === "number" ? Number(raw) : raw;
      }
    }
    return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
  }

  async function send(method: string, url: string, vals?: Record<string, string>) {
    setBusy(true);
    setMsg(null);
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
    setMsg((await res.json().catch(() => null))?.error ?? "Gagal");
    return false;
  }

  function field(f: FieldDef, value: string, onChange: (v: string) => void, key: string) {
    if (f.type === "select") {
      return (
        <select key={key} value={value} onChange={(e) => onChange(e.target.value)} disabled={busy}>
          <option value="">—</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        key={key}
        type={f.type === "number" ? "number" : "text"}
        value={value}
        placeholder={f.placeholder ?? f.label}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
      />
    );
  }

  return (
    <section className="config">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            {fields.map((f) => (
              <th key={f.key}>{f.label}</th>
            ))}
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) =>
            editing === it.id ? (
              <tr key={it.id} className="editing">
                {fields.map((f) => (
                  <td key={f.key}>
                    {field(
                      f,
                      editVals[f.key] ?? "",
                      (v) => setEditVals((s) => ({ ...s, [f.key]: v })),
                      `${it.id}-${f.key}`
                    )}
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    onClick={() => send("PUT", `${endpoint}/${it.id}`, editVals)}
                    disabled={busy}
                  >
                    Simpan
                  </button>{" "}
                  <button type="button" onClick={() => setEditing(null)} disabled={busy}>
                    Batal
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={it.id}>
                {fields.map((f) => (
                  <td key={f.key}>{fmt(it[f.key], f)}</td>
                ))}
                <td>
                  <button
                    type="button"
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
                    Edit
                  </button>{" "}
                  <button type="button" onClick={() => remove(it.id)} disabled={busy}>
                    Hapus
                  </button>
                </td>
              </tr>
            )
          )}
          <tr className="add">
            {fields.map((f) => (
              <td key={f.key}>
                {field(
                  f,
                  draft[f.key] ?? "",
                  (v) => setDraft((s) => ({ ...s, [f.key]: v })),
                  `add-${f.key}`
                )}
              </td>
            ))}
            <td>
              <button
                type="button"
                onClick={async () => {
                  if (await send("POST", endpoint, draft)) setDraft({});
                }}
                disabled={busy}
              >
                Tambah
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      {msg && <span className="note err">{msg}</span>}
    </section>
  );

  async function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Hapus item ini?")) return;
    await send("DELETE", `${endpoint}/${id}`);
  }
}

function fmt(v: unknown, f: FieldDef): string {
  if (v == null || v === "") return "—";
  if (f.type === "select") {
    return f.options?.find((o) => o.value === v)?.label ?? String(v);
  }
  return String(v);
}

/** Bangun CSV yang aman dibuka Excel: BOM UTF-8 + CRLF, quote kalau perlu. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return `﻿${lines.join("\r\n")}`;
}

/** Ambil URL dari extra_links (JSON [{label,url}]) berdasarkan label. */
export function extraLink(raw: string | null | undefined, label: string): string {
  if (!raw) return "";
  try {
    const arr = JSON.parse(raw) as { label?: string; url?: string }[];
    return (Array.isArray(arr) ? arr.find((l) => l.label === label)?.url : "") ?? "";
  } catch {
    return "";
  }
}

/** Response CSV dengan header download (nama file + timestamp). */
export function csvResponse(filename: string, csv: string): Response {
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}-${stamp}.csv"`,
    },
  });
}

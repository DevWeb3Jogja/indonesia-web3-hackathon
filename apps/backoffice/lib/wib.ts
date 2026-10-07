/**
 * Konversi deadline ↔ <input type="datetime-local"> dalam WIB (UTC+7), apa pun zona
 * waktu browser admin. Tersimpan: ISO dengan offset ("2026-10-07T23:30:00+07:00"),
 * atau data lama date-only ("2026-10-07") yang dimaknai akhir hari WIB untuk deadline
 * (lihat beforeDeadline di @iw3h/db) dan awal hari untuk tanggal buka.
 */
const FMT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Nilai tersimpan → "YYYY-MM-DDTHH:mm" (WIB). `endOfDay` untuk data lama date-only. */
export function toWibInput(v: unknown, endOfDay: boolean): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T${endOfDay ? "23:59" : "00:00"}`;
  // Tanpa offset → anggap UTC (sama dengan beforeDeadline).
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : FMT.format(d).replace(" ", "T");
}

/** "YYYY-MM-DDTHH:mm" dari input (WIB) → ISO dengan offset +07:00; kosong → null. */
export function fromWibInput(v: string): string | null {
  return v ? `${v}:00+07:00` : null;
}

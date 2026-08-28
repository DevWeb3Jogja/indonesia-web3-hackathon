"use client";

import PagedList from "./PagedList";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
interface L {
  id: number;
  createdAt: string;
  actorAddress: string;
  action: string;
  target: string | null;
}

export default function AuditPanel() {
  return (
    <PagedList<L>
      endpoint="/api/admin/audit"
      rowKey={(l) => String(l.id)}
      searchPlaceholder="Cari aksi / target / aktor…"
      columns={[
        { header: "Waktu", cell: (l) => l.createdAt },
        { header: "Aktor", cell: (l) => <code>{short(l.actorAddress)}</code> },
        { header: "Aksi", cell: (l) => l.action },
        { header: "Target", cell: (l) => (l.target ? short(l.target) : "—") },
      ]}
    />
  );
}

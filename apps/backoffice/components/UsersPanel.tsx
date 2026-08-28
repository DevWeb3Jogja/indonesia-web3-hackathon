"use client";

import PagedList from "./PagedList";
import RoleSelect from "./RoleSelect";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
interface U {
  address: string;
  username: string | null;
  role: string;
}

export default function UsersPanel() {
  return (
    <PagedList<U>
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
          cell: (u, reload) => <RoleSelect address={u.address} role={u.role} onChanged={reload} />,
        },
      ]}
    />
  );
}

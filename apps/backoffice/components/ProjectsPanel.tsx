"use client";

import PagedList from "./PagedList";
import ProjectActions from "./ProjectActions";

interface P {
  id: string;
  name: string;
  team: { name: string } | null;
  trackIds: string[];
  status: string;
}

export default function ProjectsPanel() {
  return (
    <PagedList<P>
      endpoint="/api/admin/projects"
      rowKey={(p) => p.id}
      searchPlaceholder="Cari nama / tagline…"
      filters={[
        {
          key: "status",
          label: "Status",
          options: [
            { value: "submitted", label: "submitted" },
            { value: "draft", label: "draft" },
            { value: "disqualified", label: "disqualified" },
          ],
        },
      ]}
      sorts={[
        { value: "newest", label: "Terbaru" },
        { value: "oldest", label: "Terlama" },
        { value: "name", label: "Nama A-Z" },
      ]}
      columns={[
        { header: "Nama", cell: (p) => p.name },
        { header: "Tim / Solo", cell: (p) => p.team?.name ?? "Solo" },
        { header: "Tracks", cell: (p) => p.trackIds.join(", ") || "—" },
        { header: "Status", cell: (p) => p.status },
        {
          header: "Aksi",
          cell: (p, reload) => <ProjectActions id={p.id} status={p.status} onChanged={reload} />,
        },
      ]}
    />
  );
}

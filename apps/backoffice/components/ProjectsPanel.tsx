"use client";

import PagedList from "./PagedList";
import ProjectActions from "./ProjectActions";

interface P {
  id: string;
  name: string;
  tagline: string | null;
  team: { name: string } | null;
  trackIds: string[];
  status: string;
}

export default function ProjectsPanel() {
  return (
    <PagedList<P>
      endpoint="/api/admin/projects"
      rowKey={(p) => p.id}
      searchPlaceholder="Search name / tagline…"
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
        { value: "newest", label: "Newest" },
        { value: "oldest", label: "Oldest" },
        { value: "name", label: "Name A-Z" },
      ]}
      columns={[
        { header: "Name", cell: (p) => p.name },
        { header: "Team / Solo", cell: (p) => p.team?.name ?? "Solo" },
        { header: "Tracks", cell: (p) => p.trackIds.join(", ") || "—" },
        { header: "Status", cell: (p) => p.status },
        {
          header: "Actions",
          cell: (p, reload) => (
            <ProjectActions
              id={p.id}
              name={p.name}
              tagline={p.tagline}
              status={p.status}
              onChanged={reload}
            />
          ),
        },
      ]}
    />
  );
}

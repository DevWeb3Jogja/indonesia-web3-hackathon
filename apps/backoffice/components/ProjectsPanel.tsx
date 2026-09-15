"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import DemoDayToggle from "./DemoDayToggle";
import PagedList from "./PagedList";
import ProjectActions from "./ProjectActions";
import ProjectDetails from "./ProjectDetails";

interface P {
  id: string;
  name: string;
  tagline: string | null;
  team: { name: string } | null;
  trackIds: string[];
  status: string;
  demoDay: boolean;
}

export default function ProjectsPanel() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <a href="/api/admin/projects/export?format=xlsx" download>
            <Download className="size-4" />
            Excel
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href="/api/admin/projects/export" download>
            <Download className="size-4" />
            CSV
          </a>
        </Button>
      </div>
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
            header: "Finalist",
            cell: (p, reload) => <DemoDayToggle id={p.id} demoDay={p.demoDay} onChanged={reload} />,
          },
          {
            header: "Actions",
            cell: (p, reload) => (
              <div className="flex items-center justify-end gap-1">
                <ProjectDetails id={p.id} name={p.name} />
                <ProjectActions
                  id={p.id}
                  name={p.name}
                  tagline={p.tagline}
                  status={p.status}
                  onChanged={reload}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

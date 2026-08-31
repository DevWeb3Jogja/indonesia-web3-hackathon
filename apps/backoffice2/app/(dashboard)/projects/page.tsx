import ProjectsPanel from "@/components/ProjectsPanel";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Semua status. Cari, filter, sort, paginasi (page + cursor).
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ProjectsPanel />
        </CardContent>
      </Card>
    </div>
  );
}

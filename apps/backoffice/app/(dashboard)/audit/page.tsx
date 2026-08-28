import AuditPanel from "@/components/AuditPanel";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Jejak semua aksi admin/juri.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <AuditPanel />
        </CardContent>
      </Card>
    </div>
  );
}

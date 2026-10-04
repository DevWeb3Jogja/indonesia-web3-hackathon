import AuditPanel from "@/components/AuditPanel";
import { Card, CardContent } from "@/components/ui/card";
import { pageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  // Data page ini dimuat client lewat API admin (sudah requireAuth); guard tetap dipasang
  // supaya semua page dashboard seragam — layout tak mencegah payload RSC page terkirim.
  const user = await pageUser("admin");
  if (!user) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audit log</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Trail of all admin and judge actions.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <AuditPanel />
        </CardContent>
      </Card>
    </div>
  );
}

import UsersPanel from "@/components/UsersPanel";
import { Card, CardContent } from "@/components/ui/card";
import { pageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Data page ini dimuat client lewat API admin (sudah requireAuth); guard tetap dipasang
  // supaya semua page dashboard seragam — layout tak mencegah payload RSC page terkirim.
  const user = await pageUser("admin");
  if (!user) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Search, filter roles, sort, set roles.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <UsersPanel />
        </CardContent>
      </Card>
    </div>
  );
}

import UsersPanel from "@/components/UsersPanel";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">Search, filter roles, sort, set roles.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <UsersPanel />
        </CardContent>
      </Card>
    </div>
  );
}

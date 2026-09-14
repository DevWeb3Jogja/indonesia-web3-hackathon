import { getUser } from "@iw3h/db";
import type { ReactNode } from "react";
import SignInGate from "@/components/SignInGate";
import AdminShell from "@/components/shell/AdminShell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth.getSession();
  if (!session.address) return <SignInGate reason="signin" />;

  // RBAC di layout: role dibaca segar dari DB, melindungi SEMUA route dashboard.
  const user = await getUser(db, session.address);
  if (user?.role !== "admin") return <SignInGate reason="forbidden" />;

  return <AdminShell address={user.address}>{children}</AdminShell>;
}

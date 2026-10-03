import { getUser } from "@iw3h/db";
import type { ReactNode } from "react";
import SignInGate from "@/components/SignInGate";
import AdminShell from "@/components/shell/AdminShell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

/** Grup terpisah dari (dashboard): panitia (penilai kurasi) boleh masuk SINI saja.
 *  Halaman (dashboard) tetap admin-only — berisi data pribadi peserta.
 *  Layout ini hanya UI gate; page WAJIB guard sendiri (lib/page-auth.ts). */
export default async function CurationLayout({ children }: { children: ReactNode }) {
  const session = await auth.getSession();
  if (!session.address) return <SignInGate reason="signin" />;

  const user = await getUser(db, session.address);
  if (user?.role !== "admin" && user?.role !== "panitia") {
    return <SignInGate reason="forbidden" />;
  }

  return (
    <AdminShell address={user.address} role={user.role}>
      {children}
    </AdminShell>
  );
}

import { getUser } from "@iw3h/db";
import { auth } from "@/lib/auth";
import { db } from "@/lib/turso";

/**
 * Guard untuk server component PAGE. Layout yang me-return <SignInGate/> TIDAK
 * mencegah page memuat data: Next merender layout & page paralel, dan payload RSC
 * page tetap terkirim ke browser. Jadi setiap page yang memuat data internal wajib
 * memanggil ini sendiri dan berhenti (return null) kalau tak berhak.
 */
export async function pageUser(...roles: string[]) {
  const session = await auth.getSession();
  if (!session.address) return null;
  const user = await getUser(db, session.address);
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

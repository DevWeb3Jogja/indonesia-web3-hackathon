import { ensureDemoEdition, getUser } from "@iw3h/db";
import type { Metadata } from "next";
import BigScreen from "@/components/BigScreen";
import { displayUrl, loadScreen, qrDataUri, voteTarget } from "@/lib/screen";
import { auth } from "@/lib/session";
import { db } from "@/lib/turso";
import "./screen.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Community Choice — Layar" };

/**
 * Layar besar demo day (videotron 16:9). PUBLIK untuk edisi live: komputer operator
 * cukup buka URL tanpa sign in. Aman karena isinya hanya finalis + QR + TOTAL suara
 * (voteScreen tak pernah membawa angka per project).
 * ?demo=1 → edisi demo untuk gladi, tetap KHUSUS ADMIN (men-seed edisi demo):
 * session + role segar dari DB; selain admin → null, tak ada data terkirim.
 */
export default async function ScreenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const demo = (await searchParams).demo === "1";
  if (demo) {
    const session = await auth.getSession();
    if (!session.address) return null;
    const user = await getUser(db, session.address);
    if (user?.role !== "admin") return null;
    await ensureDemoEdition(db, user.address);
  }

  const target = voteTarget(demo);
  const [initial, qr] = await Promise.all([loadScreen(demo), qrDataUri(target)]);
  return <BigScreen demo={demo} initial={initial} qrSrc={qr} urlText={displayUrl(target)} />;
}

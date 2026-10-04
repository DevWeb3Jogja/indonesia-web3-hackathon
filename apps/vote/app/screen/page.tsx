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
 * Layar besar demo day (videotron 16:9). KHUSUS ADMIN — dijaga DI PAGE INI (bukan
 * layout): session + role segar dari DB; selain admin → null, tak ada data terkirim.
 * ?demo=1 → edisi demo untuk gladi (sama seperti halaman vote).
 */
export default async function ScreenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.getSession();
  if (!session.address) return null;
  const user = await getUser(db, session.address);
  if (user?.role !== "admin") return null;

  const demo = (await searchParams).demo === "1";
  if (demo) await ensureDemoEdition(db, user.address);

  const target = voteTarget(demo);
  const [initial, qr] = await Promise.all([loadScreen(demo), qrDataUri(target)]);
  return <BigScreen demo={demo} initial={initial} qrSrc={qr} urlText={displayUrl(target)} />;
}

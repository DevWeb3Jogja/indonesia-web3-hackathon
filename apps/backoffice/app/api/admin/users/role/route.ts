import { audit, getUser, setUserRole } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const schema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  role: z.enum(["participant", "judge", "admin"]),
});

export async function PUT(req: Request) {
  const auth = await requireAuth("admin");
  if (auth instanceof Response) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  const { address, role } = parsed.data;

  // Cegah admin menurunkan role dirinya sendiri (lockout).
  if (address.toLowerCase() === auth.address.toLowerCase() && role !== "admin") {
    return NextResponse.json({ error: "Tidak bisa menurunkan role sendiri" }, { status: 409 });
  }

  const user = await getUser(db, address);
  if (!user) return NextResponse.json({ error: "User belum pernah sign-in" }, { status: 404 });

  await setUserRole(db, address, role);
  await audit(db, {
    actor: auth.address,
    action: "user.role",
    target: address,
    detail: { from: user.role, to: role },
  });
  return NextResponse.json({ ok: true, role });
}

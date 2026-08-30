import { getUser, isUsernameTaken, rateLimit, updateProfile } from "@iw3h/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { impersonates, isClean } from "@/lib/filter";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";

const profileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "Huruf, angka, - dan _ saja")
    .refine((v) => isClean(v) && !impersonates(v), "Username tidak diperbolehkan")
    .nullish(),
  email: z.string().email().max(254).nullish(),
  avatarUrl: z.string().url().max(2048).startsWith("https://").nullish(),
  bio: z.string().max(500).refine(isClean, "Mengandung kata yang tidak pantas").nullish(),
  githubUrl: z.string().url().max(2048).startsWith("https://github.com/").nullish(),
  twitterUrl: z
    .string()
    .url()
    .max(2048)
    .regex(/^https:\/\/(x|twitter)\.com\/.+/i, "Harus URL X/Twitter")
    .nullish(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  return NextResponse.json(await getUser(db, auth.address));
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `profile:${auth.address}`, 10);
  if (!limit.ok) {
    return NextResponse.json({ error: "Terlalu sering, coba lagi sebentar" }, { status: 429 });
  }

  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", detail: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Username unik lintas wallet (cek server, backstop untuk live-checker).
  if (parsed.data.username && (await isUsernameTaken(db, parsed.data.username, auth.address))) {
    return NextResponse.json(
      { error: "Username sudah dipakai", code: "username_taken" },
      {
        status: 409,
      }
    );
  }

  return NextResponse.json(await updateProfile(db, auth.address, parsed.data));
}

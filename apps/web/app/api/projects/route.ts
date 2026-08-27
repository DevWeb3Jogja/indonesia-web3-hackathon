import { clientIp } from "@iw3h/auth";
import { isContract } from "@iw3h/auth/chains";
import {
  canSubmitProject,
  createProject,
  getCurrentHackathon,
  getMyTeam,
  ProjectError,
  rateLimit,
} from "@iw3h/db";
import { NextResponse } from "next/server";
import { createProjectSchema, splitFields } from "@/lib/project-schema";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";
import type { NetworkId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `project:${clientIp(req)}`, 10, 300);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });

  const parsed = createProjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", detail: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canSubmitProject(hackathon)) {
    return NextResponse.json({ error: "Submission sedang ditutup" }, { status: 409 });
  }

  const { mode, ...rest } = parsed.data;
  const { tracks, fields } = splitFields(rest);

  // teamId diturunkan di server (tidak dipercayakan ke client).
  let teamId: string | null = null;
  if (mode === "team") {
    const team = await getMyTeam(db, hackathon.id, auth.address);
    if (!team) {
      return NextResponse.json({ error: "Kamu belum punya tim" }, { status: 409 });
    }
    teamId = team.id;
  }

  // Verifikasi bytecode kontrak (kalau diisi) — saring submission asal-asalan.
  if (fields.contractAddress && fields.network) {
    const deployed = await isContract(
      fields.network as NetworkId,
      fields.contractAddress as `0x${string}`
    ).catch(() => null);
    if (deployed === false) {
      return NextResponse.json(
        { error: "Alamat kontrak tidak ditemukan di network yang dipilih" },
        { status: 400 }
      );
    }
  }

  try {
    const project = await createProject(db, {
      hackathonId: hackathon.id,
      submitterAddress: auth.address,
      teamId,
      input: fields,
      trackIds: tracks,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    if (e instanceof ProjectError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}

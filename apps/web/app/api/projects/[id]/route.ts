import { clientIp } from "@iw3h/auth";
import { isContract } from "@iw3h/auth/chains";
import {
  canEditProject,
  canSubmitProject,
  getCurrentHackathon,
  getProjectById,
  getUser,
  isProfileComplete,
  ProjectError,
  rateLimit,
  updateProject,
} from "@iw3h/db";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { LOCALES } from "@/lib/locale";
import { projectFields, splitFields } from "@/lib/project-schema";
import { invalidateProjectsList } from "@/lib/projects-cache";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/turso";
import type { NetworkId } from "@/lib/types";

/** Invalidate cache galeri + detail (ISR) untuk semua locale. */
function revalidateProject(id: string) {
  invalidateProjectsList(); // buang TTL cache galeri (/api/projects)
  for (const l of LOCALES) {
    revalidatePath(`/${l}/projects`);
    revalidatePath(`/${l}/projects/${id}`);
  }
}

export const dynamic = "force-dynamic";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const limit = await rateLimit(db, `project-edit:${clientIp(req)}:${params.id}`, 20, 300);
  if (!limit.ok) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });

  const project = await getProjectById(db, params.id);
  if (!project) return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });

  // Edit by connected wallet: solo = submitter, tim = anggota mana pun.
  if (!(await canEditProject(db, project, auth.address))) {
    return NextResponse.json({ error: "Kamu tidak boleh mengedit project ini" }, { status: 403 });
  }

  // GitHub wajib juga untuk EDIT (submitter lama tanpa GitHub harus connect dulu).
  if (!isProfileComplete(await getUser(db, auth.address))) {
    return NextResponse.json(
      {
        error: "Lengkapi profil (username, email & connect GitHub) dulu sebelum edit",
        code: "profile_incomplete",
      },
      { status: 400 }
    );
  }

  const hackathon = await getCurrentHackathon(db);
  if (!hackathon || !canSubmitProject(hackathon)) {
    return NextResponse.json({ error: "Masa edit sudah ditutup" }, { status: 409 });
  }

  const parsed = projectFields.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", detail: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { tracks, fields } = splitFields(parsed.data);

  // Jaga invariant: field wajib (logo, website, demo video) yang SUDAH terisi tak
  // boleh dikosongkan lewat edit. Project lama yang belum punya tak dipaksa isi.
  const REQUIRED_KEEP = [
    { field: "logoUrl", label: "logo" },
    { field: "demoUrl", label: "website" },
    { field: "demoVideoUrl", label: "demo video" },
  ] as const;
  const cleared = REQUIRED_KEEP.filter((r) => project[r.field] && !fields[r.field]).map(
    (r) => r.label
  );
  if (cleared.length) {
    return NextResponse.json(
      { error: `Tidak boleh mengosongkan: ${cleared.join(", ")}`, code: "required_cleared" },
      { status: 400 }
    );
  }

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
    const updated = await updateProject(db, params.id, fields, tracks);
    revalidateProject(params.id);
    return NextResponse.json({ project: updated });
  } catch (e) {
    if (e instanceof ProjectError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}

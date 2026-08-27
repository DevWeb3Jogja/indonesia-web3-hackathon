import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { listSubmissions } from "@/lib/db";
import { explorerUrl, trackLabel, NETWORKS } from "@/lib/types";
import type { StoredSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Ekspor CSV untuk penjurian. Berisi email kontak tim, jadi WAJIB berproteksi.
 * Gagal tertutup: tanpa EXPORT_TOKEN di env, endpoint ini mati, bukan terbuka.
 */

function tokenOk(req: NextRequest): boolean {
  const expected = process.env.EXPORT_TOKEN;
  if (!expected) return false; // fail closed

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ")
    ? header.slice(7)
    : (req.nextUrl.searchParams.get("token") ?? "");
  if (!provided) return false;

  // Panjang beda -> timingSafeEqual melempar, jadi disamakan lewat hash dulu.
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Bungkus satu sel CSV: kutip ganda digandakan, koma & newline aman di dalam kutip. */
function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const COLUMNS = [
  "id",
  "createdAt",
  "updatedAt",
  "projectName",
  "tagline",
  "teamName",
  "tracks",
  "network",
  "contractAddress",
  "contractExplorerUrl",
  "githubUrl",
  "demoVideoUrl",
  "demoUrl",
  "problemStatement",
  "solution",
  "description",
  "teamSize",
  "teamMembers",
  "extraLinks",
  "email",
  "logoUrl",
] as const;

function toRow(s: StoredSubmission): string {
  const network = NETWORKS.find((n) => n.id === s.network);
  const values: Record<(typeof COLUMNS)[number], unknown> = {
    id: s.id,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    projectName: s.projectName,
    tagline: s.tagline,
    teamName: s.teamName,
    tracks: s.tracks.map(trackLabel).join(", "),
    network: network?.label ?? s.network,
    contractAddress: s.contractAddress,
    contractExplorerUrl: s.contractAddress ? explorerUrl(s.network, s.contractAddress) : "",
    githubUrl: s.githubUrl,
    demoVideoUrl: s.demoVideoUrl,
    demoUrl: s.demoUrl,
    problemStatement: s.problemStatement,
    solution: s.solution,
    description: s.description,
    teamSize: s.teamMembers.length,
    teamMembers: s.teamMembers
      .map((m) =>
        [m.name, m.role && `(${m.role})`, m.social && `<${m.social}>`].filter(Boolean).join(" ")
      )
      .join(" ; "),
    extraLinks: s.extraLinks.map((l) => `${l.label || "Link"}: ${l.url}`).join(" ; "),
    email: s.email,
    logoUrl: s.logoUrl,
  };
  return COLUMNS.map((c) => cell(values[c])).join(",");
}

export async function GET(req: NextRequest) {
  if (!tokenOk(req)) {
    return NextResponse.json(
      {
        error: process.env.EXPORT_TOKEN
          ? "Token tidak valid"
          : "Ekspor dinonaktifkan: EXPORT_TOKEN belum diset",
      },
      { status: 401 }
    );
  }

  try {
    const all = await listSubmissions();
    all.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

    // BOM ditulis sebagai escape, bukan karakter literal: U+FEFF tak terlihat
    // di editor dan gampang hilang saat file disunting.
    const BOM = "\uFEFF";
    const csv = BOM + [COLUMNS.join(","), ...all.map(toRow)].join("\r\n") + "\r\n";

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal mengekspor" }, { status: 500 });
  }
}

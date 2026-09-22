import { getProjectById } from "@iw3h/db";
import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { db } from "@/lib/turso";
import { trackLabel } from "@/lib/types";

// OG card per-project (dinamis) → tiap share link beda. Logo project ditampilkan
// kalau bisa di-render satori (png/jpeg); webp/gagal → fallback monogram huruf.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

const GOLD = "#f2ba2b";

/** Ambil logo jadi data URL. Same-origin path → prefix origin dari header. null =
 *  gagal/unsupported → pemanggil pakai monogram. */
async function loadLogo(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  let abs = logoUrl;
  if (logoUrl.startsWith("/")) {
    const h = await headers();
    const host = h.get("host");
    if (!host) return null;
    abs = `${h.get("x-forwarded-proto") ?? "https"}://${host}${logoUrl}`;
  }
  try {
    const res = await fetch(abs);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    // satori (next/og) hanya rasterize png/jpeg/gif. webp/svg → null → monogram.
    if (!/^image\/(png|jpe?g|gif)$/i.test(ct)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProjectById(db, id).catch(() => null);
  const name = p?.name ?? "Project";
  const tagline = p?.tagline ?? "Indonesia Web3 Hackathon 2026";
  const tracks = (p?.trackIds ?? []).slice(0, 3).map(trackLabel);
  const team = p?.team?.name ?? null;
  const logo = await loadLogo(p?.logoUrl);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: "linear-gradient(135deg, #0a0a0a 0%, #141006 60%, #1c1608 100%)",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 24,
          letterSpacing: 4,
          fontWeight: 700,
          color: GOLD,
          textTransform: "uppercase",
        }}
      >
        Indonesia Web3 Hackathon 2026
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        {logo ? (
          <img
            src={logo}
            alt={name}
            width={128}
            height={128}
            style={{
              width: 128,
              height: 128,
              borderRadius: 28,
              marginRight: 40,
              objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 128,
              height: 128,
              borderRadius: 28,
              marginRight: 40,
              background: GOLD,
              color: "#0a0a0a",
              fontSize: 72,
              fontWeight: 800,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 860 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, lineHeight: 1.05 }}>
            {name.length > 42 ? `${name.slice(0, 42)}…` : name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 30,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {tagline.length > 110 ? `${tagline.slice(0, 110)}…` : tagline}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
          {tracks.map((tr) => (
            <div
              key={tr}
              style={{
                display: "flex",
                marginRight: 12,
                padding: "10px 22px",
                borderRadius: 999,
                border: "2px solid rgba(242,186,43,0.5)",
                color: GOLD,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {tr}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.6)" }}>
          {team ? `Team ${team}` : "indonesiaweb3hack.xyz"}
        </div>
      </div>
    </div>,
    size
  );
}

import { GeneratedAvatar } from "./GeneratedAvatar";

export interface StackMember {
  address: string;
  githubUrl?: string | null;
  username?: string | null;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Ambil handle GitHub dari URL profil (github.com/<user>). */
function githubHandle(url: string | null | undefined): string | null {
  return url?.match(/github\.com\/([^/?#]+)/i)?.[1] ?? null;
}

/** Facepile bertumpuk: avatar GitHub kalau ada, kalau tidak generated avatar.
 *  Hover → popover berisi username GitHub (atau username/alamat). "+N" untuk sisa.
 *  CSS-only (server component) — tooltip pakai group-hover. */
export default function AvatarStack({
  members,
  max = 6,
  size = 40,
}: {
  members: StackMember[];
  max?: number;
  size?: number;
}) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  const overlap = Math.round(size * 0.32);

  return (
    <div className="flex items-center">
      {shown.map((m, i) => {
        const handle = githubHandle(m.githubUrl);
        const label = handle ? `@${handle}` : m.username || short(m.address);
        const src = handle ? `https://github.com/${handle}.png?size=${size * 2}` : null;
        return (
          <span
            key={m.address}
            className="group/av relative inline-flex transition-[z-index] hover:z-[60]"
            style={{
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: shown.length - i,
            }}
          >
            <span
              className="inline-flex overflow-hidden rounded-full bg-black ring-2 ring-black"
              style={{ width: size, height: size }}
            >
              {src ? (
                <img
                  src={src}
                  alt=""
                  width={size}
                  height={size}
                  className="h-full w-full object-cover"
                />
              ) : (
                <GeneratedAvatar name={m.address} size={size} />
              )}
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-black shadow-lg group-hover/av:block">
              {label}
            </span>
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className="relative inline-flex items-center justify-center rounded-full bg-white/[0.08] font-semibold text-white ring-2 ring-black"
          style={{
            width: size,
            height: size,
            marginLeft: -overlap,
            fontSize: Math.round(size * 0.3),
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

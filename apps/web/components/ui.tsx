import type { ReactNode } from "react";

/* ponytail: 2 ikon = 2 SVG inline, nggak perlu install lucide-react */

export function Sparkles({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9.94 6.06 9 3l-.94 3.06L5 7l3.06.94L9 11l.94-3.06L13 7l-3.06-.94Z" />
      <path d="M18.5 12.5 18 11l-.5 1.5L16 13l1.5.5.5 1.5.5-1.5L20 13l-1.5-.5Z" />
      <path d="M14.44 17.44 13.5 14.5l-.94 2.94L9.5 18.5l3.06.94.94 2.94.94-2.94 3.06-.94-3.06-1.06Z" />
    </svg>
  );
}

export function ArrowUpRight({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}

export function Plus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Alert({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/**
 * Border chamfered berbasis SVG. Dipakai untuk kartu kecil yang proporsinya
 * stabil — potongan sudutnya ikut skala kartu (14% dari sisi).
 */
export function ChamferBorder({ className = "text-teal/25" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <polygon
        points="14,0 100,0 100,86 86,100 0,100 0,14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Panel bergaris rambut dengan sudut terpotong px-akurat.
 * Trik: pembungkus diwarnai warna garis + padding 1px, isinya di-clip sama.
 */
export function Panel({
  children,
  clip = "chamfer",
  className = "",
  tone = "bg-white",
  soft = false,
}: {
  children: ReactNode;
  clip?: "chamfer" | "chamfer-sm" | "chamfer-lg";
  className?: string;
  tone?: string;
  soft?: boolean;
}) {
  return (
    <div className={`${soft ? "hairline-soft" : "hairline"} ${clip} ${className}`}>
      <div className={`h-full w-full ${clip} ${tone}`}>{children}</div>
    </div>
  );
}

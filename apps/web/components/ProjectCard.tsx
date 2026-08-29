import Link from "next/link";
import { localePath } from "@/lib/locale";
import type { PublicProjectCard } from "@/lib/types";
import { trackLabel } from "@/lib/types";
import { ArrowUpRight } from "./ui";

export default function ProjectCard({
  p,
  locale,
  byLabel,
  soloLabel,
}: {
  p: PublicProjectCard;
  locale: string;
  byLabel: string;
  soloLabel: string;
}) {
  return (
    <Link
      href={localePath(locale, `/projects/${p.id}`)}
      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-4">
        {p.logoUrl ? (
          <img
            src={p.logoUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 font-firs text-lg font-semibold text-white/80 ring-1 ring-white/10">
            {p.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-firs text-lg font-semibold text-white">{p.name}</h3>
          <p className="truncate text-sm text-white/50">
            {p.teamName ? `${byLabel} ${p.teamName}` : soloLabel}
          </p>
        </div>
      </div>

      {p.tagline && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-white/70">{p.tagline}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
        <div className="flex flex-wrap gap-2">
          {p.trackIds.map((t) => (
            <span key={t} className="tag">
              {trackLabel(t)}
            </span>
          ))}
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

import Link from "next/link";
import type { Submission } from "@/lib/types";
import { trackLabel } from "@/lib/types";
import { localePath } from "@/lib/locale";
import { ArrowUpRight, Panel } from "./ui";

export default function ProjectCard({
  p,
  locale,
  byLabel,
}: {
  p: Submission;
  locale: string;
  byLabel: string;
}) {
  return (
    <Panel
      clip="chamfer-lg"
      className="group h-full transition duration-200 hover:-translate-y-0.5"
    >
      <Link
        href={localePath(locale, `/projects/${p.id}`)}
        className="flex h-full flex-col p-6"
      >
        <div className="flex items-start gap-4">
          {p.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.logoUrl}
              alt=""
              className="chamfer-sm h-12 w-12 shrink-0 object-cover"
            />
          ) : (
            <div className="chamfer-sm flex h-12 w-12 shrink-0 items-center justify-center bg-teal/10 font-firs text-lg font-semibold text-teal">
              {p.projectName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-firs text-lg font-semibold text-ink transition group-hover:text-teal">
              {p.projectName}
            </h3>
            <p className="truncate text-sm text-ink/55">
              {byLabel} {p.teamName}
            </p>
          </div>
        </div>

        {p.tagline && (
          <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink/75">
            {p.tagline}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex flex-wrap gap-2">
            {p.tracks.map((t) => (
              <span key={t} className="tag">
                {trackLabel(t)}
              </span>
            ))}
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-teal/50 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </Link>
    </Panel>
  );
}

import { REGISTER_URL } from "@/lib/content";
import { Alert, ArrowUpRight } from "./ui";

/**
 * Peringatan kelayakan: submission hanya sah kalau tim sudah daftar di Luma.
 * Dipakai di section submissions (landing) dan di atas form /submit.
 */
export default function EligibilityWarning({
  label,
  message,
  cta,
  className = "",
  compact = false,
}: {
  label: string;
  message: string;
  cta: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`hairline chamfer ${className}`}>
      <div className={`chamfer bg-teal/[0.07] ${compact ? "p-4" : "p-5 sm:p-6"}`}>
        <div className="flex items-start gap-3 text-left">
          <span className="mt-0.5 shrink-0 text-teal">
            <Alert className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal">
              {label}
            </p>
            <p
              className={`mt-2 leading-relaxed text-ink/85 ${compact ? "text-[13px]" : "text-sm"}`}
            >
              {message}
            </p>
            <a
              href={REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal underline underline-offset-4 hover:opacity-70"
            >
              {cta}
              <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

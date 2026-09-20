import { TELEGRAM_URL } from "@/lib/content";
import type { Dict } from "@/lib/i18n";
import { ArrowUpRight } from "./ui";

/**
 * Bubble bantuan di kanan bawah. <details> native: buka/tutup tanpa state,
 * tanpa "use client", tetap keyboard-accessible.
 * ponytail: klik di luar tidak menutup — cukup klik tombolnya lagi.
 */
export default function SupportBubble({ t }: { t: Dict["support"] }) {
  return (
    <details className="group fixed bottom-5 right-5 z-[100] print:hidden">
      <summary
        className="flex h-12 cursor-pointer list-none items-center gap-2 rounded-full border border-white/20 bg-white px-5 text-sm font-semibold text-black shadow-lg shadow-black/40 transition hover:bg-white/90 [&::-webkit-details-marker]:hidden"
        aria-label={t.open}
      >
        <ChatIcon className="h-4 w-4" />
        <span className="group-open:hidden">{t.open}</span>
        <span className="hidden group-open:inline">{t.close}</span>
      </summary>

      <div className="absolute bottom-14 right-0 w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-white/15 bg-black/95 p-5 shadow-2xl shadow-black/60 backdrop-blur">
        <p className="text-sm font-semibold text-white">{t.title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/60">{t.body}</p>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link mt-4 block rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 transition hover:border-white/30 hover:bg-white/10"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium text-white">
            {t.telegram}
            <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
          </span>
          <span className="mt-0.5 block text-[11px] text-white/50">{t.telegramHint}</span>
        </a>
      </div>
    </details>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path
        d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4.3-1L3 20l1.2-4.4A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

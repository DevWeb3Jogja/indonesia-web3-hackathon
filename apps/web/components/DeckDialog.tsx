"use client";

import { useId, useRef, useState } from "react";
import { ArrowUpRight } from "./ui";

/** Chip "Pitch Deck" → lihat deck di dialog (native <dialog>) tanpa harus download dulu.
 *  Iframe baru dipasang saat dialog dibuka supaya halaman tetap ringan. */
export default function DeckDialog({
  url,
  embed,
  download,
  downloadLabel,
  label,
  openLabel,
  closeLabel,
}: {
  url: string;
  embed: string;
  download: string | null;
  downloadLabel: string;
  label: string;
  openLabel: string;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="link-chip"
        onClick={() => {
          setOpen(true);
          ref.current?.showModal();
        }}
      >
        {label}
      </button>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard sudah ditangani native (Esc menutup <dialog>); klik backdrop cuma pelengkap mouse. */}
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        // Klik backdrop (di luar panel) = tutup.
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        className="w-[min(1100px,calc(100vw-2rem))] max-w-none rounded-2xl bg-[#0b0b0b] p-0 text-white ring-1 ring-white/15 backdrop:bg-black/80"
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <p id={titleId} className="eyebrow">
            {label}
          </p>
          <div className="flex items-center gap-4 text-xs text-white/60">
            {download && (
              <a href={download} download className="hover:text-white">
                {downloadLabel} ↓
              </a>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-white"
            >
              {openLabel}
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <button type="button" onClick={() => ref.current?.close()} className="hover:text-white">
              {closeLabel} ✕
            </button>
          </div>
        </div>
        <div className="relative aspect-video bg-black">
          {open && (
            <iframe
              src={embed}
              title={label}
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          )}
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Track pills satu baris. Yang tak muat → diringkas jadi "+N"; hover/focus +N
 * memunculkan popover berisi track yang disembunyikan. Lebar diukur (ResizeObserver)
 * lewat measurer tersembunyi supaya adaptif ke lebar kartu.
 */
export default function TrackTags({ labels }: { labels: string[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(labels.length);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    const meas = measureRef.current;
    if (!row || !meas) return;

    const GAP = 8;
    const compute = () => {
      const avail = row.clientWidth;
      const pills = Array.from(meas.querySelectorAll<HTMLElement>("[data-pill]"));
      const plusW = meas.querySelector<HTMLElement>("[data-plus]")?.offsetWidth ?? 32;
      const widths = pills.map((p) => p.offsetWidth);
      const total = widths.reduce((s, w, i) => s + w + (i ? GAP : 0), 0);
      if (total <= avail) {
        setCount(labels.length); // semua muat, tanpa +N
        return;
      }
      const reserve = plusW + GAP; // sisakan ruang buat +N
      let used = 0;
      let k = 0;
      for (let i = 0; i < widths.length; i++) {
        const add = widths[i] + (i ? GAP : 0);
        if (used + add + reserve <= avail) {
          used += add;
          k++;
        } else break;
      }
      setCount(Math.max(1, k)); // minimal 1 pill
    };

    const ro = new ResizeObserver(compute);
    ro.observe(row);
    compute();
    return () => ro.disconnect();
  }, [labels]);

  if (labels.length === 0) return null;
  const hidden = labels.slice(count);

  return (
    <div ref={rowRef} className="relative min-w-0 flex-1">
      {/* Measurer: semua pill + sampel +N, tak terlihat & tak ganggu layout. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 flex gap-2 opacity-0"
      >
        {labels.map((l) => (
          <span key={l} data-pill className="tag whitespace-nowrap">
            {l}
          </span>
        ))}
        <span data-plus className="tag">
          +9
        </span>
      </div>

      {/* Tanpa overflow-hidden: cuma render pill yg muat, dan popover +N (bottom-full)
          harus bisa keluar dari kotak baris — overflow-hidden akan memotongnya. */}
      <div className="flex flex-nowrap gap-2">
        {labels.slice(0, count).map((l) => (
          <span key={l} className="tag whitespace-nowrap">
            {l}
          </span>
        ))}
        {hidden.length > 0 && (
          // z-[2]: di atas stretched-link kartu supaya hover/klik +N kena, bukan navigasi.
          <button
            type="button"
            className="tag relative z-[2] shrink-0 cursor-default"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onClick={(e) => {
              e.preventDefault(); // jangan navigasi kartu; toggle utk sentuh/mobile
              setOpen((o) => !o);
            }}
          >
            +{hidden.length}
            {open && (
              <span className="absolute bottom-full left-0 z-20 mb-2 flex w-max max-w-[240px] flex-col gap-1 rounded-lg border border-white/15 bg-black p-2 shadow-lg">
                {hidden.map((l) => (
                  <span key={l} className="whitespace-nowrap text-[11px] text-white/80">
                    {l}
                  </span>
                ))}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

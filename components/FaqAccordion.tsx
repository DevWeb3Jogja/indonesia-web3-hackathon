"use client";

import { useState } from "react";
import { Plus } from "./ui";

interface Item {
  q: string;
  a: string;
}

export default function FaqAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="hairline-soft chamfer-lg">
      <div className="chamfer-lg bg-white">
        {items.map((item, i) => (
          <div key={item.q} className="border-b border-teal/12 last:border-b-0">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center gap-5 px-6 py-5 text-left transition hover:bg-haze"
            >
              <span className="text-[11px] font-medium tracking-[0.18em] text-teal/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 font-medium text-ink">{item.q}</span>
              <span
                className={`shrink-0 text-teal transition-transform duration-200 ${
                  open === i ? "rotate-45" : ""
                }`}
              >
                <Plus />
              </span>
            </button>
            <div
              className={`grid transition-all duration-200 ${
                open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 pl-[62px] text-sm leading-relaxed text-ink/75">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

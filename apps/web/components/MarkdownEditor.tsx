"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  value: string;
  onChange: (v: string) => void;
  t: Dict["form"];
  rows?: number;
}

export default function MarkdownEditor({ value, onChange, t, rows = 14 }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  const tabClass = (target: typeof tab) =>
    `chamfer-sm px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition ${
      tab === target ? "bg-teal text-white" : "text-ink/60 hover:text-teal"
    }`;

  return (
    <div className="border border-teal/25 bg-white">
      <div className="flex items-center justify-between border-b border-teal/15 bg-haze px-2 py-1.5">
        <div className="flex gap-1">
          <button type="button" onClick={() => setTab("write")} className={tabClass("write")}>
            {t.write}
          </button>
          <button type="button" onClick={() => setTab("preview")} className={tabClass("preview")}>
            {t.preview}
          </button>
        </div>
        <span className="hidden pr-2 text-[10px] uppercase tracking-[0.14em] text-teal/60 sm:block">
          {t.markdownHint}
        </span>
      </div>

      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.descriptionPlaceholder}
          rows={rows}
          className="w-full resize-y bg-white px-4 py-3 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-ink/35"
        />
      ) : (
        <div className="max-h-[560px] min-h-[200px] overflow-y-auto px-5 py-4">
          {value.trim() ? (
            <MarkdownRenderer content={value} errorLabel={t.mermaidError} />
          ) : (
            <p className="text-sm text-ink/55">{t.previewEmpty}</p>
          )}
        </div>
      )}
    </div>
  );
}

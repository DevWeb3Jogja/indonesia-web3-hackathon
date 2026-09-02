"use client";

import { useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { resizeToWebp, uploadImage } from "@/lib/image";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  value: string;
  onChange: (v: string) => void;
  t: Dict["form"];
  rows?: number;
}

export default function MarkdownEditor({ value, onChange, t, rows = 14 }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tabClass = (target: typeof tab) =>
    `chamfer-sm px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition ${
      tab === target ? "bg-white text-black" : "text-ink/60 hover:text-teal"
    }`;

  /** Sisipkan teks di posisi kursor (atau di akhir) lalu kembalikan fokus. */
  function insertAtCursor(snippet: string) {
    const ta = taRef.current;
    if (!ta) {
      onChange(value + snippet);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + snippet + value.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function onImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith("image/")) return setErr(t.imgInvalid);
    if (file.size > 15 * 1024 * 1024) return setErr(t.imgTooBig);
    setUploading(true);
    try {
      const blob = await resizeToWebp(file, 1600, "contain", 0.82);
      insertAtCursor(`\n\n![](${await uploadImage(blob)})\n\n`);
    } catch {
      setErr(t.imgError);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border border-teal/25 bg-white/[0.04]">
      <div className="flex items-center justify-between border-b border-teal/15 bg-haze px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setTab("write")} className={tabClass("write")}>
            {t.write}
          </button>
          <button type="button" onClick={() => setTab("preview")} className={tabClass("preview")}>
            {t.preview}
          </button>
          {tab === "write" && (
            <>
              <span className="mx-1 h-4 w-px bg-white/15" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="chamfer-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink/60 transition hover:text-teal disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="m21 15-5-5L5 21" stroke="currentColor" strokeWidth="2" />
                </svg>
                {uploading ? t.imgUploading : t.imgInsert}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onImageFile}
                className="hidden"
              />
            </>
          )}
        </div>
        <span className="hidden pr-2 text-[10px] uppercase tracking-[0.14em] text-teal/80 sm:block">
          {t.markdownHint}
        </span>
      </div>

      {tab === "write" ? (
        <>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t.descriptionPlaceholder}
            rows={rows}
            className="w-full resize-y bg-white/[0.04] px-4 py-3 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-ink/35"
          />
          {err && <p className="px-4 pb-2 text-[11px] text-red-500">{err}</p>}
        </>
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

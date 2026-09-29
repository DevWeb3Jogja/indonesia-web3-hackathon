"use client";

import { useEffect, useId, useRef, useState } from "react";

let mermaidInit = false;

export default function Mermaid({
  chart,
  errorLabel = "Invalid mermaid diagram",
}: {
  chart: string;
  errorLabel?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<HTMLDivElement>(null);
  // Pesan error Mermaid (baris + alasan) — dulu ditelan, author tak tahu apa yang salah.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        if (!mermaidInit) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "base",
            themeVariables: {
              primaryColor: "#F0F5F7",
              primaryTextColor: "#154359",
              primaryBorderColor: "#066377",
              lineColor: "#066377",
              secondaryColor: "#E4EEF2",
              tertiaryColor: "#FFFFFF",
              background: "#FFFFFF",
              mainBkg: "#F0F5F7",
              nodeBorder: "#066377",
              fontFamily: 'var(--font-body), "Inter", system-ui, -apple-system, sans-serif',
            },
          });
          mermaidInit = true;
        }
        // Tunggu webfont siap: Mermaid mengukur lebar label saat render — kalau font
        // belum termuat, ukurannya pakai font fallback → teks terpotong.
        await document.fonts.ready;
        const { svg } = await mermaid.render(`mmd-${id}`, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e instanceof Error ? e.message : String(e)).slice(0, 600));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div role="img" aria-label={errorLabel}>
        <pre className="!border !border-red-300">
          <code>{chart}</code>
        </pre>
        <p className="mt-2 text-xs font-medium text-red-300">{errorLabel}</p>
        <pre className="!mt-1 !border-0 !bg-transparent !p-0 text-[11px] leading-snug text-red-300/80">
          {error}
        </pre>
      </div>
    );
  }
  return <div ref={ref} className="mermaid-diagram" />;
}

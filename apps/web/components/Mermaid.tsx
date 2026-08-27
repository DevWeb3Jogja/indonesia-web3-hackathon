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
  const [failed, setFailed] = useState(false);

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
              fontFamily: "inherit",
            },
          });
          mermaidInit = true;
        }
        const { svg } = await mermaid.render(`mmd-${id}`, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (failed) {
    return (
      <pre className="!border !border-red-300" aria-label={errorLabel}>
        <code>{chart}</code>
      </pre>
    );
  }
  return <div ref={ref} className="mermaid-diagram" />;
}

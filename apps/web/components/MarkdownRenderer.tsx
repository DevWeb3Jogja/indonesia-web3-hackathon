"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Mermaid from "./Mermaid";

export default function MarkdownRenderer({
  content,
  errorLabel,
}: {
  content: string;
  errorLabel?: string;
}) {
  // Normalisasi escape literal "\n"/"\r\n" (mis. dari seed) jadi baris baru asli,
  // supaya heading/paragraf markdown tak tergabung jadi satu baris.
  const normalized = content.replace(/\\r\\n|\\n/g, "\n");
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const text = String(children).replace(/\n$/, "");
            if (match?.[1] === "mermaid") {
              return <Mermaid chart={text} errorLabel={errorLabel} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          // Bungkus tabel agar scroll horizontal di dalam kartu, bukan meluber
          // keluar (mis. tabel alamat kontrak yang panjang di mobile).
          table({ children }) {
            return (
              <div className="md-table-scroll">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

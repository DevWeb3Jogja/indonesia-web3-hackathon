"use client";

import type { Root } from "mdast";
import { findAndReplace } from "mdast-util-find-and-replace";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { explorerLink } from "@/lib/types";
import Mermaid from "./Mermaid";

// Tx hash (64 hex) dulu, baru address (40 hex) — supaya hash tak terpotong jadi address.
const HEX_REF = /\b0x(?:[0-9a-fA-F]{64}|[0-9a-fA-F]{40})\b/g;

/** Remark: address/tx di teks biasa → link explorer (kode & link yang ada tak disentuh). */
const remarkExplorerLinks = (network?: string | null) => () => (tree: Root) =>
  findAndReplace(tree, [
    HEX_REF,
    (value: string) => ({
      type: "link",
      url: explorerLink(network, value) ?? "",
      children: [{ type: "text", value }],
    }),
  ]);

export default function MarkdownRenderer({
  content,
  errorLabel,
  network,
}: {
  content: string;
  errorLabel?: string;
  /** Network project — untuk link explorer address/tx. */
  network?: string | null;
}) {
  // Normalisasi escape literal "\n"/"\r\n" (mis. dari seed) jadi baris baru asli,
  // supaya heading/paragraf markdown tak tergabung jadi satu baris.
  const normalized = content.replace(/\\r\\n|\\n/g, "\n");
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkExplorerLinks(network)]}
        // README hasil salin sering pakai HTML (<img>, <div align>). Render seperti GitHub:
        // raw → sanitize (skema GitHub; buang script/event handler/iframe). Urutan wajib.
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const text = String(children).replace(/\n$/, "");
            if (match?.[1] === "mermaid") {
              return <Mermaid chart={text} errorLabel={errorLabel} />;
            }
            const code = (
              <code className={className} {...props}>
                {children}
              </code>
            );
            // Inline code berisi URL / address / tx → bisa diklik (block code dibiarkan).
            const href =
              !className && !text.includes("\n")
                ? /^https?:\/\/\S+$/.test(text.trim())
                  ? text.trim()
                  : explorerLink(network, text.trim())
                : null;
            return href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {code}
              </a>
            ) : (
              code
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          // Blur sampai gambar selesai di-load (bukan render setengah-setengah).
          // `complete` menangkap gambar dari cache yang load sebelum hydrate.
          img({ src, alt }) {
            const done = (el: HTMLImageElement) => {
              el.dataset.loaded = "";
            };
            return (
              <img
                src={typeof src === "string" ? src : undefined}
                alt={alt ?? ""}
                loading="lazy"
                decoding="async"
                ref={(el) => {
                  if (el?.complete) done(el);
                }}
                onLoad={(e) => done(e.currentTarget)}
                onError={(e) => done(e.currentTarget)}
              />
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

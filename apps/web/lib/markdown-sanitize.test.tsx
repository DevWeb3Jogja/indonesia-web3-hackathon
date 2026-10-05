import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarkdownRenderer from "../components/MarkdownRenderer";

const html = (md: string) => renderToStaticMarkup(<MarkdownRenderer content={md} />);

describe("MarkdownRenderer + raw HTML", () => {
  it("render <img> & <div align> dari README", () => {
    const out = html(
      '<div align="center">\n<img src="https://x.test/a.png" alt="shot" width="300" />\n</div>'
    );
    expect(out).toContain('src="https://x.test/a.png"');
    expect(out).toContain('alt="shot"');
  });
  it("buang script, event handler, javascript: URL", () => {
    const out = html(
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">x</a>'
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("javascript:");
  });
  it("blok mermaid tetap dikenali (className language-* lolos sanitize)", () => {
    expect(html("```mermaid\ngraph TD\nA-->B\n```")).toContain("mermaid-diagram");
  });
});

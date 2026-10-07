import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarkdownRenderer from "../components/MarkdownRenderer";

const html = (md: string, network?: string) =>
  renderToStaticMarkup(<MarkdownRenderer content={md} network={network} />);
const ADDR = "0x5f2AC81d58582C16f606d38927120e4676A1e07b";
const TX = `0x${"ab".repeat(32)}`;

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

  it("address & tx di teks biasa / inline code → link explorer sesuai network", () => {
    const out = html(`Kontrak ${ADDR} tx \`${TX}\` docs \`https://docs.x.test\``, "opBNB Testnet");
    expect(out).toContain(`href="https://opbnb-testnet.bscscan.com/address/${ADDR}"`);
    expect(out).toContain(`href="https://opbnb-testnet.bscscan.com/tx/${TX}"`);
    expect(out).toContain('href="https://docs.x.test"');
  });
  it("address di dalam code block tak diubah jadi link", () => {
    expect(html(`\`\`\`solidity\naddress a = ${ADDR};\n\`\`\``)).not.toContain("bscscan");
  });
});

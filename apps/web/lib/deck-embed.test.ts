import { describe, expect, it } from "vitest";
import { deckDownloadUrl, deckEmbedUrl } from "./deck-embed";

const SLIDES =
  "https://docs.google.com/presentation/d/1bHWrnu55mHpaiR2BbRBqxQsyZC_aLkAJeVSFl4OZ4mM/edit?usp=sharing";
const DRIVE =
  "https://drive.google.com/file/d/1pBvgkcwoC-lWyaCtBuHaDRVKAONKUa6y/view?usp=drive_link";
const CANVA = "https://www.canva.com/design/DAHWhvXM0RE/_G2UhCcQMC1Wm1hULHXyTQ/edit";
const UPLOAD = "/api/uploads/r2/desc/0xabc/1.pptx";

describe("deckEmbedUrl", () => {
  it("upload .pptx → Office viewer dengan URL absolut", () => {
    const e = deckEmbedUrl(UPLOAD) ?? "";
    expect(e).toMatch(
      /^https:\/\/view\.officeapps\.live\.com\/op\/embed\.aspx\?src=https%3A%2F%2F/
    );
    expect(decodeURIComponent(e)).toContain(UPLOAD);
  });
  it("Google Slides / Drive / Canva → URL embed", () => {
    expect(deckEmbedUrl(SLIDES)).toBe(
      "https://docs.google.com/presentation/d/1bHWrnu55mHpaiR2BbRBqxQsyZC_aLkAJeVSFl4OZ4mM/preview"
    );
    expect(deckEmbedUrl(DRIVE)).toBe(
      "https://drive.google.com/file/d/1pBvgkcwoC-lWyaCtBuHaDRVKAONKUa6y/preview"
    );
    expect(deckEmbedUrl("https://drive.google.com/open?id=1BGjsx&usp=drive_fs")).toBe(
      "https://drive.google.com/file/d/1BGjsx/preview"
    );
    expect(deckEmbedUrl(CANVA)).toBe(
      "https://www.canva.com/design/DAHWhvXM0RE/_G2UhCcQMC1Wm1hULHXyTQ/view?embed"
    );
  });
  it("tak dikenal / tak bisa di-embed → null", () => {
    for (const u of [
      "https://drive.google.com/drive/folders/1nZ",
      "https://canva.com/",
      "https://x.vercel.app/deck",
      "https://a.app/deck.key",
      "https://belum-sempet-bikinppt",
      "not a url ::",
    ]) {
      expect(deckEmbedUrl(u), u).toBeNull();
    }
  });
});

describe("deckDownloadUrl", () => {
  it("file, Slides (export pptx), Drive; Canva tak ada", () => {
    expect(deckDownloadUrl(UPLOAD)).toMatch(/^https:\/\/.+\/1\.pptx$/);
    expect(deckDownloadUrl(SLIDES)).toBe(
      "https://docs.google.com/presentation/d/1bHWrnu55mHpaiR2BbRBqxQsyZC_aLkAJeVSFl4OZ4mM/export/pptx"
    );
    expect(deckDownloadUrl(DRIVE)).toBe(
      "https://drive.google.com/uc?export=download&id=1pBvgkcwoC-lWyaCtBuHaDRVKAONKUa6y"
    );
    expect(deckDownloadUrl(CANVA)).toBeNull();
  });
});

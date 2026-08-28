import { describe, expect, it } from "vitest";
import { canRegister, canScore, canSubmitProject, isFrozen } from "../src/phase";

const at = (iso: string) => new Date(iso);

describe("phase guards", () => {
  it("registrasi buka saat fase registration dan submission", () => {
    expect(canRegister({ status: "registration" })).toBe(true);
    expect(canRegister({ status: "submission" })).toBe(true);
    expect(canRegister({ status: "draft" })).toBe(false);
    expect(canRegister({ status: "judging" })).toBe(false);
  });

  it("submit hanya saat fase submission", () => {
    expect(canSubmitProject({ status: "submission" })).toBe(true);
    expect(canSubmitProject({ status: "registration" })).toBe(false);
    expect(canSubmitProject({ status: "judging" })).toBe(false);
  });

  it("deadline eksplisit mengunci meski status masih submission", () => {
    const h = { status: "submission", submissionClosesAt: "2026-10-01 00:00:00" };
    expect(canSubmitProject(h, at("2026-09-30T23:59:00Z"))).toBe(true);
    expect(canSubmitProject(h, at("2026-10-01T00:00:01Z"))).toBe(false);
  });

  it("deadline kosong berarti hanya status yang menentukan", () => {
    expect(canSubmitProject({ status: "submission", submissionClosesAt: null })).toBe(true);
  });

  it("deadline date-only dianggap akhir hari (UTC)", () => {
    const h = { status: "submission", submissionClosesAt: "2026-10-01" };
    expect(canSubmitProject(h, at("2026-10-01T23:00:00Z"))).toBe(true); // masih hari itu
    expect(canSubmitProject(h, at("2026-10-02T00:00:01Z"))).toBe(false); // lewat hari
  });

  it("deadline ISO dengan Z tidak double-append", () => {
    const h = { status: "submission", submissionClosesAt: "2026-10-01T00:00:00Z" };
    expect(canSubmitProject(h, at("2026-09-30T23:59:00Z"))).toBe(true);
    expect(canSubmitProject(h, at("2026-10-01T00:00:01Z"))).toBe(false);
  });

  it("deadline malformed tidak diam-diam mengunci (status yang menentukan)", () => {
    const h = { status: "submission", submissionClosesAt: "bukan-tanggal" };
    expect(canSubmitProject(h, at("2026-10-01T00:00:00Z"))).toBe(true);
  });

  it("scoring hanya saat judging, beku setelah completed", () => {
    expect(canScore({ status: "judging" })).toBe(true);
    expect(canScore({ status: "completed" })).toBe(false);
    expect(isFrozen({ status: "completed" })).toBe(true);
    expect(isFrozen({ status: "judging" })).toBe(false);
  });
});

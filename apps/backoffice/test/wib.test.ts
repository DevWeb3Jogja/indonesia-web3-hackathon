import { describe, expect, it } from "vitest";
import { fromWibInput, toWibInput } from "@/lib/wib";

describe("WIB datetime input", () => {
  it("ISO dengan offset → jam WIB (jam tidak hilang)", () => {
    expect(toWibInput("2026-10-07T23:30:00+07:00", true)).toBe("2026-10-07T23:30");
    expect(toWibInput("2026-10-07T16:30:00Z", true)).toBe("2026-10-07T23:30");
  });
  it("data lama date-only → akhir hari (deadline) / awal hari (buka)", () => {
    expect(toWibInput("2026-10-07", true)).toBe("2026-10-07T23:59");
    expect(toWibInput("2026-09-01", false)).toBe("2026-09-01T00:00");
  });
  it("kosong / tak valid → ''", () => {
    expect(toWibInput(null, true)).toBe("");
    expect(toWibInput("bukan tanggal", true)).toBe("");
  });
  it("round-trip: input → simpan → input sama", () => {
    expect(fromWibInput("2026-10-07T23:30")).toBe("2026-10-07T23:30:00+07:00");
    expect(toWibInput(fromWibInput("2026-10-07T23:30"), true)).toBe("2026-10-07T23:30");
    expect(fromWibInput("")).toBeNull();
  });
});

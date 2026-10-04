import { describe, expect, it } from "vitest";
import {
  fullyScored,
  indexOfProject,
  isDirty,
  SWIPE_MIN_PX,
  stepIndex,
  swipeStep,
} from "./judge-stepper";

describe("swipeStep", () => {
  it("geser ke kiri = berikutnya, ke kanan = sebelumnya", () => {
    expect(swipeStep(-80, 5)).toBe(1);
    expect(swipeStep(80, -5)).toBe(-1);
  });

  it("tap / geser pendek bukan swipe (radio tetap bisa di-tap)", () => {
    expect(swipeStep(0, 0)).toBe(0);
    expect(swipeStep(SWIPE_MIN_PX - 1, 0)).toBe(0);
    expect(swipeStep(-(SWIPE_MIN_PX - 1), 0)).toBe(0);
    expect(swipeStep(-SWIPE_MIN_PX, 0)).toBe(1);
  });

  it("scroll vertikal / diagonal curam tak memicu pindah", () => {
    expect(swipeStep(-70, 300)).toBe(0);
    expect(swipeStep(90, 61)).toBe(0); // 90 < 1.5 × 61
    expect(swipeStep(90, 59)).toBe(-1);
    expect(swipeStep(Number.NaN, 0)).toBe(0);
  });
});

describe("stepIndex & indexOfProject", () => {
  it("melangkah dalam batas; keluar batas → null (tak berputar)", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, 1, 3)).toBeNull();
    expect(stepIndex(0, -1, 3)).toBeNull();
    expect(stepIndex(1, -1, 3)).toBe(0);
    expect(stepIndex(0, 1, 0)).toBeNull();
  });

  it("?p= dikenal → index-nya; kosong/tak dikenal → 0", () => {
    expect(indexOfProject(["a", "b", "c"], "c")).toBe(2);
    expect(indexOfProject(["a", "b"], "zz")).toBe(0);
    expect(indexOfProject(["a"], null)).toBe(0);
    expect(indexOfProject([], "a")).toBe(0);
  });
});

describe("fullyScored & isDirty", () => {
  const crit = ["inn", "des"];
  const base = { vals: { inn: 4, des: 3 }, teamNote: "ok", internalNote: "" };

  it("lengkap hanya bila semua kriteria bernilai ≥ 1", () => {
    expect(fullyScored(crit, { inn: 4, des: 3 })).toBe(true);
    expect(fullyScored(crit, { inn: 4, des: 0 })).toBe(false);
    expect(fullyScored(crit, { inn: 4 })).toBe(false);
    expect(fullyScored(crit, undefined)).toBe(false);
    expect(fullyScored([], {})).toBe(false);
  });

  it("perubahan nilai / catatan = dirty; spasi di ujung catatan tidak", () => {
    expect(isDirty(base, { ...base }, crit)).toBe(false);
    expect(isDirty(base, { ...base, teamNote: " ok  " }, crit)).toBe(false);
    expect(isDirty(base, { ...base, vals: { inn: 5, des: 3 } }, crit)).toBe(true);
    expect(isDirty(base, { ...base, internalNote: "x" }, crit)).toBe(true);
    // kriteria yang belum diisi (0) = sama dengan tak ada
    expect(isDirty({ ...base, vals: {} }, { ...base, vals: { inn: 0 } }, crit)).toBe(false);
  });
});

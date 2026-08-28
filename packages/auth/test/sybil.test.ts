import { describe, expect, it } from "vitest";
import { checkWalletSybil } from "../src/sybil";

const ADDR = "0x1111111111111111111111111111111111111111" as const;

describe("anti-sybil gate", () => {
  it("gate mati (minTxCount 0) → selalu lolos tanpa RPC", async () => {
    let called = false;
    const res = await checkWalletSybil(ADDR, { minTxCount: 0 }, async () => {
      called = true;
      return 0;
    });
    expect(res.ok).toBe(true);
    expect(called).toBe(false); // tidak menyentuh RPC saat mati
  });

  it("di bawah ambang → ditolak", async () => {
    const res = await checkWalletSybil(ADDR, { minTxCount: 3 }, async () => 1);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("insufficient_activity");
    expect(res.txCount).toBe(1);
  });

  it("tepat / di atas ambang → lolos", async () => {
    expect((await checkWalletSybil(ADDR, { minTxCount: 3 }, async () => 3)).ok).toBe(true);
    expect((await checkWalletSybil(ADDR, { minTxCount: 3 }, async () => 9)).ok).toBe(true);
  });

  it("RPC error → fail-open (jangan blokir user sah)", async () => {
    const res = await checkWalletSybil(ADDR, { minTxCount: 3 }, async () => {
      throw new Error("rpc down");
    });
    expect(res.ok).toBe(true);
    expect(res.reason).toBe("rpc_error");
  });
});

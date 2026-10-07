import { describe, expect, it } from "vitest";
import { explorerLink, networkOf } from "./types";

const ADDR = "0x5f2AC81d58582C16f606d38927120e4676A1e07b";
const TX = `0x${"ab".repeat(32)}`;

describe("networkOf", () => {
  it("terima id form maupun label data impor", () => {
    expect(networkOf("bsc-testnet").id).toBe("bsc-testnet");
    expect(networkOf("BNB Smart Chain Testnet").id).toBe("bsc-testnet");
    expect(networkOf("BNB Smart Chain").id).toBe("bsc");
    expect(networkOf("opBNB Testnet").id).toBe("opbnb-testnet");
    expect(networkOf("opBNB").id).toBe("opbnb");
    expect(networkOf(null).id).toBe("bsc");
  });
});

describe("explorerLink", () => {
  it("address → /address/, tx → /tx/, lainnya null", () => {
    expect(explorerLink("BNB Smart Chain Testnet", ADDR)).toBe(
      `https://testnet.bscscan.com/address/${ADDR}`
    );
    expect(explorerLink("opbnb", TX)).toBe(`https://opbnb.bscscan.com/tx/${TX}`);
    expect(explorerLink("bsc", "0x1234")).toBeNull();
  });
});

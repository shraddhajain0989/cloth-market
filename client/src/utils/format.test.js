import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("formats INR values correctly", () => {
    expect(formatCurrency(1999)).toContain("1,999");
    expect(formatCurrency(0)).toContain("0");
    expect(formatCurrency(100000)).toContain("1,00,000");
  });
});

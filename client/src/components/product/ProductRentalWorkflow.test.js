import { describe, expect, it } from "vitest";

describe("Rental WhatsApp Message & Flow Verification", () => {
  function buildRentalWhatsAppMessage({ product, selectedSize, startDate, endDate, durationDays, totalRentalAmount, refCode }) {
    const prodId = product.id || product._id || "N/A";
    return `Hello Cloth Market! I would like to rent this outfit:

*Outfit:* ${product.name}
*Product ID:* ${prodId}
*Size:* ${selectedSize}
*Rental Dates:* ${startDate} to ${endDate} (${durationDays} days)
*Total Rental Price:* ₹${totalRentalAmount.toLocaleString("en-IN")}
*Reference:* ${refCode}

Please confirm availability and share payment instructions.`;
  }

  function calculateRentalTotal(dailyRate, start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e - s;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (days <= 0 || isNaN(days)) return { days: 0, total: 0 };
    return { days, total: days * dailyRate };
  }

  it("calculates total rental correctly as dailyRate * durationDays", () => {
    const { days, total } = calculateRentalTotal(750, "2026-11-01", "2026-11-05");
    expect(days).toBe(4);
    expect(total).toBe(3000);
  });

  it("rejects invalid date ranges (end before or equal to start)", () => {
    const res1 = calculateRentalTotal(500, "2026-11-05", "2026-11-01");
    expect(res1.days).toBe(0);
    expect(res1.total).toBe(0);

    const res2 = calculateRentalTotal(500, "2026-11-05", "2026-11-05");
    expect(res2.days).toBe(0);
    expect(res2.total).toBe(0);
  });

  it("builds authoritative WhatsApp prefill message without ₹50 advance references", () => {
    const product = {
      _id: "prod-9988",
      name: "Royal Velvet Sherwani",
      rentPrice: 1200
    };
    const { days, total } = calculateRentalTotal(product.rentPrice, "2026-12-10", "2026-12-13");
    const msg = buildRentalWhatsAppMessage({
      product,
      selectedSize: "XL",
      startDate: "2026-12-10",
      endDate: "2026-12-13",
      durationDays: days,
      totalRentalAmount: total,
      refCode: "REF-TEST1234"
    });

    expect(msg).toContain("*Outfit:* Royal Velvet Sherwani");
    expect(msg).toContain("*Product ID:* prod-9988");
    expect(msg).toContain("*Size:* XL");
    expect(msg).toContain("*Rental Dates:* 2026-12-10 to 2026-12-13 (3 days)");
    expect(msg).toContain("*Total Rental Price:* ₹3,600");
    expect(msg).toContain("*Reference:* REF-TEST1234");
    expect(msg).not.toContain("₹50");
    expect(msg).not.toContain("Advance");
    expect(msg).not.toContain("advance");
  });

  it("constructs valid WhatsApp URL with encoded message", () => {
    const businessWhatsApp = "919876543210";
    const sampleMessage = "Hello Cloth Market! *Outfit:* Velvet Sherwani";
    const cleanPhone = businessWhatsApp.replace(/\D/g, "");
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(sampleMessage)}`;

    expect(waUrl).toBe("https://wa.me/919876543210?text=Hello%20Cloth%20Market!%20*Outfit%3A*%20Velvet%20Sherwani");
    expect(cleanPhone).toMatch(/^\d+$/);
  });
});

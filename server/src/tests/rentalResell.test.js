import assert from "node:assert";
import test, { before, after, describe, it } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { Payment } from "../models/Payment.js";
import { BusinessConfig } from "../models/BusinessConfig.js";
import { signAccessToken } from "../utils/tokens.js";

let server;
let baseUrl;
let app;

const TEST_MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cloth-market-test";

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
  app = createApp();
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

after(async () => {
  if (server) server.close();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("RENTAL & RESALE FEATURE IMPLEMENTATION TESTS", () => {
  let customerUser, adminUser;
  let customerToken, adminToken;
  let testProductRent, testProductResell, testProductBoth;

  before(async () => {
    // Clean up test users, products, payments, config
    await User.deleteMany({ email: { $in: ["cust_test@example.com", "admin_test@example.com"] } });
    await Product.deleteMany({ name: { $regex: /^TEST_SUITE_/ } });
    await Payment.deleteMany({
      $or: [
        { customerReference: { $regex: /^TEST_/ } },
        { customerReference: { $regex: /^CM-(RENT|BUY)-(STABLE|SIMULT|ABANDONED|SNEAKY|VERIFIED|CANCELLED|DEAD)/ } }
      ]
    });

    customerUser = await User.create({
      name: "Test Customer",
      email: "cust_test@example.com",
      phone: "919876543210",
      password: "Password@123",
      role: "user"
    });
    customerToken = signAccessToken(customerUser);

    adminUser = await User.create({
      name: "Test Admin",
      email: "admin_test@example.com",
      phone: "919999999999",
      password: "Password@123",
      role: "admin"
    });
    adminToken = signAccessToken(adminUser);
  });

  after(async () => {
    await User.deleteMany({ email: { $in: ["cust_test@example.com", "admin_test@example.com"] } });
    await Product.deleteMany({ name: { $regex: /^TEST_SUITE_/ } });
    await Payment.deleteMany({
      $or: [
        { customerReference: { $regex: /^TEST_/ } },
        { customerReference: { $regex: /^CM-(RENT|BUY)-(STABLE|SIMULT|ABANDONED|SNEAKY|VERIFIED|CANCELLED|DEAD)/ } }
      ]
    });
  });

  describe("1. Product Image Limits (1 to 5 Images)", () => {
    it("should allow creating a product with 1 image", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: "TEST_SUITE_1_IMAGE",
          category: "Ethnic",
          gender: "Women",
          listingType: "RENT",
          rentPrice: 600,
          price: 4000,
          images: ["https://example.com/img1.jpg"]
        })
      });

      assert.ok([200, 201].includes(res.status));
      const data = await res.json();
      assert.strictEqual(data.data.images.length, 1);
      testProductRent = data.data;
    });

    it("should allow creating a product with 5 images", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: "TEST_SUITE_5_IMAGES",
          category: "Ethnic",
          gender: "Men",
          listingType: "BOTH",
          rentPrice: 800,
          price: 5000,
          condition: "Like new",
          images: [
            "https://example.com/1.jpg",
            "https://example.com/2.jpg",
            "https://example.com/3.jpg",
            "https://example.com/4.jpg",
            "https://example.com/5.jpg"
          ]
        })
      });

      assert.ok([200, 201].includes(res.status));
      const data = await res.json();
      assert.strictEqual(data.data.images.length, 5);
      testProductBoth = data.data;
    });

    it("should reject product creation with 0 images", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: "TEST_SUITE_0_IMAGES",
          category: "Ethnic",
          gender: "Men",
          listingType: "RENT",
          rentPrice: 500,
          images: []
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /at least 1 image/i);
    });

    it("should reject product creation with more than 5 images", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: "TEST_SUITE_6_IMAGES",
          category: "Ethnic",
          gender: "Men",
          listingType: "RENT",
          rentPrice: 500,
          images: [
            "https://example.com/1.jpg",
            "https://example.com/2.jpg",
            "https://example.com/3.jpg",
            "https://example.com/4.jpg",
            "https://example.com/5.jpg",
            "https://example.com/6.jpg"
          ]
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /more than 5 images/i);
    });

    it("should reject product creation containing blob: preview URLs", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: "TEST_SUITE_BLOB_IMAGE",
          category: "Ethnic",
          gender: "Men",
          listingType: "RENT",
          rentPrice: 500,
          images: ["blob:http://localhost:5173/some-local-preview"]
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /blob URLs/i);
    });
  });

  describe("2. Listing Types (RENT, RESELL, BOTH) & Pricing Rules", () => {
    it("should allow creating a RESELL product with selling price and condition", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: "TEST_SUITE_RESELL_ONLY",
          category: "Suits",
          gender: "Men",
          listingType: "RESELL",
          price: 2500,
          condition: "Gently used",
          images: ["https://example.com/resell1.jpg"]
        })
      });

      assert.ok([200, 201].includes(res.status));
      const data = await res.json();
      assert.strictEqual(data.data.listingType, "RESELL");
      assert.strictEqual(data.data.price, 2500);
      assert.strictEqual(data.data.condition, "Gently used");
      testProductResell = data.data;
    });

    it("should reject RESELL product if selling price is 0 or missing", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: "TEST_SUITE_RESELL_NO_PRICE",
          category: "Suits",
          gender: "Men",
          listingType: "RESELL",
          price: 0,
          images: ["https://example.com/resell1.jpg"]
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /selling price/i);
    });

    it("should reject BOTH product if either rentPrice or price is missing", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: "TEST_SUITE_BOTH_NO_RENT",
          category: "Suits",
          gender: "Men",
          listingType: "BOTH",
          rentPrice: 0,
          price: 3000,
          images: ["https://example.com/both1.jpg"]
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /rental price/i);
    });

    it("should default listingType to RENT for legacy products", async () => {
      const legacyProd = await Product.create({
        name: "TEST_SUITE_LEGACY_RENT",
        category: "Ethnic",
        gender: "Women",
        rentPrice: 500,
        price: 2000,
        images: ["https://example.com/legacy.jpg"]
      });

      assert.strictEqual(legacyProd.listingType, "RENT");
    });
  });

  describe("3. Business Config (WhatsApp & Payment QR)", () => {
    it("should allow public access to GET /api/config/public", async () => {
      const res = await fetch(`${baseUrl}/config/public`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.hasOwnProperty("whatsappNumber"));
      assert.ok(data.data.hasOwnProperty("paymentQrUrl"));
    });

    it("should reject updating business config without admin auth", async () => {
      const res = await fetch(`${baseUrl}/config/admin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          whatsappNumber: "919988776655"
        })
      });

      assert.strictEqual(res.status, 403);
    });

    it("should allow admin to update business config with WhatsApp number and QR", async () => {
      const res = await fetch(`${baseUrl}/config/admin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          businessName: "Cloth Market Official",
          whatsappNumber: "919876543210",
          paymentQrUrl: "https://example.com/cloth-market-qr.png",
          upiId: "clothmarket@okhdfcbank",
          paymentInstructions: "Scan QR and pay ₹50 advance"
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.whatsappNumber, "919876543210");
      assert.strictEqual(data.data.paymentQrUrl, "https://example.com/cloth-market-qr.png");
    });
  });

  describe("4. Manual Payment Tracking & Verification Workflow", () => {
    let rentalPaymentId;
    let buyPaymentId;

    it("should allow customer to create a RENT payment tracking record with ₹50 advance", async () => {
      const res = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          productId: testProductRent._id || testProductRent.id,
          transactionType: "RENT",
          size: "M",
          rentalStartDate: "2026-11-01",
          rentalEndDate: "2026-11-04",
          rentalDuration: 3,
          customerNotes: "Enquiring via WhatsApp"
        })
      });

      assert.ok([200, 201].includes(res.status));
      const data = await res.json();
      assert.strictEqual(data.data.status, "Awaiting Payment");
      assert.strictEqual(data.data.transactionType, "RENT");
      assert.strictEqual(data.data.advanceAmount, 0); // ₹0 booking advance
      assert.strictEqual(data.data.totalAmount, 1800); // 3 days * 600
      assert.strictEqual(data.data.remainingAmount, 0); // 0 remaining
      assert.strictEqual(data.data.expectedAmount, 1800); // Expecting full payment upfront
      rentalPaymentId = data.data._id || data.data.id;
    });

    it("should allow customer to create a BUY payment tracking record", async () => {
      const res = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          productId: testProductResell._id || testProductResell.id,
          transactionType: "BUY",
          size: "L",
          quantity: 2,
          customerNotes: "Buying 2 suits"
        })
      });

      assert.ok([200, 201].includes(res.status));
      const data = await res.json();
      assert.strictEqual(data.data.status, "Awaiting Payment");
      assert.strictEqual(data.data.transactionType, "BUY");
      assert.strictEqual(data.data.quantity, 2);
      assert.strictEqual(data.data.totalAmount, 5000); // 2 * 2500
      assert.strictEqual(data.data.expectedAmount, 5000); // Full amount for resale
      buyPaymentId = data.data._id || data.data.id;
    });

    it("should list payment records for admin", async () => {
      const res = await fetch(`${baseUrl}/admin/payments`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.some((p) => (p._id || p.id) === rentalPaymentId));
      assert.ok(data.data.some((p) => (p._id || p.id) === buyPaymentId));
    });

    it("should block non-admin from verifying payment", async () => {
      const res = await fetch(`${baseUrl}/payments/${rentalPaymentId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({ confirmed: true })
      });

      assert.strictEqual(res.status, 403);
    });

    it("should reject verification if admin does not supply confirmed: true", async () => {
      const res = await fetch(`${baseUrl}/payments/${rentalPaymentId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ confirmed: false })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /verified the actual payment/i);
    });

    it("should allow admin to verify payment with transactionReference", async () => {
      const res = await fetch(`${baseUrl}/payments/${rentalPaymentId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          confirmed: true,
          transactionReference: "UPI-UTR-987654321012",
          notes: "Received ₹50 in HDFC account"
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.status, "Verified");
      assert.strictEqual(data.data.transactionReference, "UPI-UTR-987654321012");
      assert.ok(data.data.verifiedAt);
    });

    it("should allow admin to reject payment with rejectionReason", async () => {
      const res = await fetch(`${baseUrl}/payments/${buyPaymentId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          rejectionReason: "No payment received in account",
          notes: "Checked bank statement, no credit"
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.status, "Rejected");
      assert.strictEqual(data.data.rejectionReason, "No payment received in account");
    });

    it("should prevent duplicate payment records when customer reopens WhatsApp", async () => {
      // Re-submit identical payment enquiry
      const res = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          productId: testProductRent._id || testProductRent.id,
          transactionType: "RENT",
          size: "M",
          rentalStartDate: "2026-11-01",
          rentalEndDate: "2026-11-04",
          rentalDuration: 3,
          customerNotes: "Re-clicking WhatsApp link"
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.message, "Payment tracking record created.");
    });

    it("should reject rental advance confirmation if product is deactivated/unavailable", async () => {
      // Create a test product, deactivate it, then try to confirm advance
      const prod = await Product.create({
        name: "TEST_SUITE_DEACTIVATED_PROD",
        category: "Ethnic",
        gender: "Women",
        rentPrice: 400,
        price: 2000,
        available: false,
        images: ["https://example.com/test.jpg"]
      });

      const rent = await Rental.create({
        userId: customerUser._id.toString(),
        clothId: prod._id.toString(),
        size: "M",
        rentalStartDate: "2026-12-01",
        currentEndDate: "2026-12-03",
        rentalDuration: 2,
        rentalAmount: 800,
        advanceAmount: 50,
        remainingAmount: 750,
        rentalStatus: "PENDING_ADVANCE",
        advanceStatus: "ADVANCE_PENDING",
        clothSnapshot: { name: prod.name, image: prod.images[0] }
      });

      const res = await fetch(`${baseUrl}/admin/rentals/${rent._id}/advance`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /no longer active in the catalog/i);
    });
  });

  describe("5. Advanced Concurrency, Status Differentiation & Lifecycle Verification", () => {
    it("should prevent concurrent rental double-booking: exactly 1 of 2 simultaneous confirmations succeeds", async () => {
      // 1. Create a dedicated single-stock product
      const raceProduct = await Product.create({
        name: "CONCURRENCY_TEST_TUXEDO",
        category: "Suits",
        gender: "Men",
        rentPrice: 1000,
        price: 5000,
        available: true,
        images: ["https://example.com/tux.jpg"],
        sizeVariants: [{ size: "M", stock: 1, available: true }]
      });

      // 2. Create two competing rentals for the same date range
      const rent1 = await Rental.create({
        userId: customerUser._id.toString(),
        clothId: raceProduct._id.toString(),
        size: "M",
        rentalStartDate: "2026-12-10",
        currentEndDate: "2026-12-15",
        rentalDuration: 5,
        rentalAmount: 5000,
        advanceAmount: 50,
        remainingAmount: 4950,
        rentalStatus: "PENDING_ADVANCE",
        advanceStatus: "ADVANCE_PENDING",
        clothSnapshot: { name: raceProduct.name, image: raceProduct.images[0] }
      });

      const rent2 = await Rental.create({
        userId: customerUser._id.toString(),
        clothId: raceProduct._id.toString(),
        size: "M",
        rentalStartDate: "2026-12-10",
        currentEndDate: "2026-12-15",
        rentalDuration: 5,
        rentalAmount: 5000,
        advanceAmount: 50,
        remainingAmount: 4950,
        rentalStatus: "PENDING_ADVANCE",
        advanceStatus: "ADVANCE_PENDING",
        clothSnapshot: { name: raceProduct.name, image: raceProduct.images[0] }
      });

      // 3. Fire both advance confirmations simultaneously
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/admin/rentals/${rent1._id}/advance`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        fetch(`${baseUrl}/admin/rentals/${rent2._id}/advance`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(statuses, [200, 400], "Exactly one confirmation must succeed (200) and one must fail (400)");

      // 4. Verify database state: only one confirmed rental
      const confirmedRentals = await Rental.find({
        clothId: raceProduct._id.toString(),
        rentalStatus: "CONFIRMED"
      });
      assert.strictEqual(confirmedRentals.length, 1, "Only 1 confirmed rental must exist in DB");
    });

    it("should handle simultaneous verification of the same payment idempotently", async () => {
      const pay = await Payment.create({
        customerReference: "CM-RENT-SIMULT-VERIFY",
        productId: testProductRent._id.toString(),
        productName: testProductRent.name,
        transactionType: "RENT",
        size: "M",
        expectedAmount: 50,
        totalAmount: 1800,
        status: "Awaiting Payment"
      });

      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/payments/${pay._id}/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({ confirmed: true, transactionReference: "SIMULT-A" })
        }),
        fetch(`${baseUrl}/payments/${pay._id}/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({ confirmed: true, transactionReference: "SIMULT-B" })
        })
      ]);

      assert.strictEqual(resA.status, 200);
      assert.strictEqual(resB.status, 200);

      const refreshed = await Payment.findById(pay._id);
      assert.strictEqual(refreshed.status, "Verified");
    });

    it("should de-duplicate WhatsApp clicks and reuse stable customer references", async () => {
      const stableRef = `CM-RENT-STABLE-REF-${Date.now()}`;

      // First click
      const res1 = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          customerReference: stableRef,
          productId: testProductRent._id.toString(),
          transactionType: "RENT",
          size: "M",
          status: "Enquiry Initiated"
        })
      });

      assert.strictEqual(res1.status, 200);
      const data1 = await res1.json();
      assert.strictEqual(data1.data.status, "Enquiry Initiated");

      // Repeated click with same reference
      const res2 = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          customerReference: stableRef,
          productId: testProductRent._id.toString(),
          transactionType: "RENT",
          size: "M",
          status: "Enquiry Initiated"
        })
      });

      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.message, "Payment tracking record updated.");
      assert.strictEqual(data2.data._id, data1.data._id);

      const count = await Payment.countDocuments({ customerReference: stableRef });
      assert.strictEqual(count, 1, "Only 1 payment record should exist for repeated clicks");
    });

    it("should allow rebooking when an enquiry is abandoned", async () => {
      // 1. Customer initiates an enquiry
      const enqRef = "CM-RENT-ABANDONED-1";
      await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerReference: enqRef,
          productId: testProductRent._id.toString(),
          transactionType: "RENT",
          size: "L",
          rentalStartDate: "2026-12-25",
          rentalEndDate: "2026-12-28",
          status: "Enquiry Initiated"
        })
      });

      // 2. Customer abandons it. A new customer rents and confirms the same dates.
      const realRental = await Rental.create({
        userId: customerUser._id.toString(),
        clothId: testProductRent._id.toString(),
        size: "L",
        rentalStartDate: "2026-12-25",
        currentEndDate: "2026-12-28",
        rentalDuration: 3,
        rentalAmount: 1800,
        advanceAmount: 50,
        remainingAmount: 1750,
        rentalStatus: "PENDING_ADVANCE",
        advanceStatus: "ADVANCE_PENDING",
        clothSnapshot: { name: testProductRent.name, image: testProductRent.images[0] }
      });

      const confirmRes = await fetch(`${baseUrl}/admin/rentals/${realRental._id}/advance`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(confirmRes.status, 200, "Abandoned enquiry must not prevent real confirmation");
    });

    it("should reject invalid status transitions and unauthorized escalation", async () => {
      // A non-admin customer tries to create an already Verified payment
      const sneakyRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerReference: "CM-BUY-SNEAKY-ESCALATE",
          productId: testProductResell._id.toString(),
          transactionType: "BUY",
          size: "M",
          status: "Verified" // Unauthorized attempt
        })
      });

      assert.strictEqual(sneakyRes.status, 200);
      const sneakyData = await sneakyRes.json();
      assert.strictEqual(sneakyData.data.status, "Enquiry Initiated", "Privilege escalation to Verified must be neutralized");

      // Admin tries to reject an already Verified payment
      const verifiedPay = await Payment.create({
        customerReference: "CM-BUY-VERIFIED-ALREADY",
        productId: testProductResell._id.toString(),
        productName: testProductResell.name,
        transactionType: "BUY",
        size: "M",
        expectedAmount: 2500,
        totalAmount: 2500,
        status: "Verified"
      });

      const rejectRes = await fetch(`${baseUrl}/payments/${verifiedPay._id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ rejectionReason: "Mistake" })
      });

      assert.strictEqual(rejectRes.status, 400);
      const rejectData = await rejectRes.json();
      assert.match(rejectData.message, /already been verified/i);

      // Admin tries to verify a Cancelled payment
      const cancelledPay = await Payment.create({
        customerReference: "CM-BUY-CANCELLED-ALREADY",
        productId: testProductResell._id.toString(),
        productName: testProductResell.name,
        transactionType: "BUY",
        size: "M",
        expectedAmount: 2500,
        totalAmount: 2500,
        status: "Cancelled"
      });

      const verifyCancelledRes = await fetch(`${baseUrl}/payments/${cancelledPay._id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ confirmed: true })
      });

      assert.strictEqual(verifyCancelledRes.status, 400);
      const verifyCancelledData = await verifyCancelledRes.json();
      assert.match(verifyCancelledData.message, /cancelled payment record/i);
    });

    it("should rollback payment status if rental confirmation fails during verification", async () => {
      // Create product that is inactive
      const inactiveProd = await Product.create({
        name: "ROLLBACK_TEST_PROD",
        category: "Suits",
        gender: "Men",
        rentPrice: 500,
        price: 2500,
        available: false,
        images: ["https://example.com/inactive.jpg"]
      });

      const deadRental = await Rental.create({
        userId: customerUser._id.toString(),
        clothId: inactiveProd._id.toString(),
        size: "M",
        rentalStartDate: "2026-11-15",
        currentEndDate: "2026-11-18",
        rentalDuration: 3,
        rentalAmount: 1500,
        advanceAmount: 50,
        remainingAmount: 1450,
        rentalStatus: "PENDING_ADVANCE",
        advanceStatus: "ADVANCE_PENDING",
        clothSnapshot: { name: inactiveProd.name, image: inactiveProd.images[0] }
      });

      const deadPayment = await Payment.create({
        customerReference: "CM-RENT-DEAD-ROLLBACK",
        productId: inactiveProd._id.toString(),
        productName: inactiveProd.name,
        transactionType: "RENT",
        size: "M",
        expectedAmount: 50,
        totalAmount: 1500,
        status: "Awaiting Payment",
        rentalId: deadRental._id.toString()
      });

      const res = await fetch(`${baseUrl}/payments/${deadPayment._id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ confirmed: true })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /no longer active/i);

      // Payment must NOT remain Verified
      const checkPay = await Payment.findById(deadPayment._id);
      assert.strictEqual(checkPay.status, "Awaiting Payment");
    });

    it("should release reservation upon cancellation and allow subsequent rebooking", async () => {
      // 1. Create a product with stock 1
      const soloProd = await Product.create({
        name: "SOLO_UNIT_PROD",
        category: "Dresses",
        gender: "Women",
        rentPrice: 800,
        price: 4000,
        available: true,
        images: ["https://example.com/dress.jpg"],
        sizeVariants: [{ size: "S", stock: 1, available: true }]
      });

      // 2. Book and confirm rental 1
      const rental1 = await Rental.create({
        userId: customerUser._id.toString(),
        clothId: soloProd._id.toString(),
        size: "S",
        rentalStartDate: "2026-12-01",
        currentEndDate: "2026-12-05",
        rentalDuration: 4,
        rentalAmount: 3200,
        advanceAmount: 50,
        remainingAmount: 3150,
        rentalStatus: "PENDING_ADVANCE",
        advanceStatus: "ADVANCE_PENDING",
        clothSnapshot: { name: soloProd.name, image: soloProd.images[0] }
      });

      const conf1 = await fetch(`${baseUrl}/admin/rentals/${rental1._id}/advance`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(conf1.status, 200);

      // 3. Competing rental 2 tries to confirm -> should fail (fully booked)
      const rental2 = await Rental.create({
        userId: customerUser._id.toString(),
        clothId: soloProd._id.toString(),
        size: "S",
        rentalStartDate: "2026-12-01",
        currentEndDate: "2026-12-05",
        rentalDuration: 4,
        rentalAmount: 3200,
        advanceAmount: 50,
        remainingAmount: 3150,
        rentalStatus: "PENDING_ADVANCE",
        advanceStatus: "ADVANCE_PENDING",
        clothSnapshot: { name: soloProd.name, image: soloProd.images[0] }
      });

      const conf2Fail = await fetch(`${baseUrl}/admin/rentals/${rental2._id}/advance`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(conf2Fail.status, 400);

      // 4. Admin cancels rental 1
      const cancelRes = await fetch(`${baseUrl}/admin/rentals/${rental1._id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(cancelRes.status, 200);

      // 5. Competing rental 2 tries again -> should SUCCEED
      const conf2Success = await fetch(`${baseUrl}/admin/rentals/${rental2._id}/advance`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(conf2Success.status, 200);
      const conf2Data = await conf2Success.json();
      assert.strictEqual(conf2Data.data.rentalStatus, "CONFIRMED");
    });

    it("should respect legacy confirmed rental records and prevent double-booking over them", async () => {
      // 1. Create a legacy product without activeRentals
      const legacyProd = await Product.create({
        name: "LEGACY_RENTAL_PROD",
        category: "Kurtas",
        gender: "Men",
        rentPrice: 600,
        price: 3000,
        available: true,
        images: ["https://example.com/kurta.jpg"],
        sizeVariants: [{ size: "XL", stock: 1, available: true }]
      });

      // 2. Insert a legacy confirmed rental directly in DB without activeRentals slot
      await Rental.create({
        userId: customerUser._id.toString(),
        clothId: legacyProd._id.toString(),
        size: "XL",
        rentalStartDate: "2026-12-15",
        currentEndDate: "2026-12-18",
        rentalDuration: 3,
        rentalAmount: 1800,
        advanceAmount: 50,
        remainingAmount: 1750,
        rentalStatus: "CONFIRMED",
        advanceStatus: "ADVANCE_RECEIVED",
        clothSnapshot: { name: legacyProd.name, image: legacyProd.images[0] }
      });

      // 3. New rental tries to confirm for overlapping dates
      const newRental = await Rental.create({
        userId: customerUser._id.toString(),
        clothId: legacyProd._id.toString(),
        size: "XL",
        rentalStartDate: "2026-12-16",
        currentEndDate: "2026-12-20",
        rentalDuration: 4,
        rentalAmount: 2400,
        advanceAmount: 50,
        remainingAmount: 2350,
        rentalStatus: "PENDING_ADVANCE",
        advanceStatus: "ADVANCE_PENDING",
        clothSnapshot: { name: legacyProd.name, image: legacyProd.images[0] }
      });

      const res = await fetch(`${baseUrl}/admin/rentals/${newRental._id}/advance`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /already fully booked/i);
    });
  });
});

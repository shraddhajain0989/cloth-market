import assert from "node:assert";
import test, { before, after, describe } from "node:test";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { Payment } from "../models/Payment.js";
import { signAccessToken } from "../utils/tokens.js";
import {
  reserveRentalSlot,
  releaseRentalSlot,
  extendRentalSlot,
  reconcileLegacyRentals
} from "../utils/rentalReservation.js";

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

describe("PRODUCTION HARDENING & RESERVATION LIFECYCLE AUDIT TEST SUITE", () => {
  let customerUser, adminUser;
  let customerToken, adminToken;

  before(async () => {
    const passwordHash = await bcrypt.hash("Password@123", 10);
    customerUser = await User.create({
      name: "Renter Customer",
      email: `renter_hard_${Date.now()}@test.com`,
      password: passwordHash,
      role: "user"
    });
    adminUser = await User.create({
      name: "Inventory Staff",
      email: `admin_hard_${Date.now()}@test.com`,
      password: passwordHash,
      role: "admin"
    });

    customerToken = signAccessToken(customerUser);
    adminToken = signAccessToken(adminUser);
  });

  describe("1. Rental Extension Reservation Consistency", () => {
    test("approving an extension updates currentEndDate and extends Product.activeRentals reservation", async () => {
      const prod = await Product.create({
        name: "Extension Sherwani",
        category: "Ethnic",
        rentPrice: 600,
        price: 3000,
        available: true,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2026-11-01",
        originalEndDate: "2026-11-03",
        currentEndDate: "2026-11-03",
        rentalDuration: 2,
        rentalAmount: 1200,
        remainingAmount: 1150,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "ACTIVE_RENTAL",
        extensionHistory: [
          {
            requestedEndDate: "2026-11-06",
            previousEndDate: "2026-11-03",
            additionalDays: 3,
            additionalAmount: 1800,
            status: "REQUESTED"
          }
        ]
      });

      // Initial reservation
      await reserveRentalSlot(rental);

      // Verify initial product reservation endDate
      let freshProd = await Product.findById(prod.id);
      let resv = freshProd.activeRentals.find((r) => r.rentalId === rental.id);
      assert.strictEqual(resv.endDate, "2026-11-03");

      // Admin approves extension
      const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/extension`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ decision: "APPROVED" })
      });
      assert.strictEqual(res.status, 200);

      // Verify Rental currentEndDate updated
      const updatedRental = await Rental.findById(rental.id);
      assert.strictEqual(updatedRental.currentEndDate, "2026-11-06");
      assert.strictEqual(updatedRental.rentalStatus, "EXTENDED");

      // Verify Product.activeRentals reservation slot updated to 2026-11-06
      freshProd = await Product.findById(prod.id);
      resv = freshProd.activeRentals.find((r) => r.rentalId === rental.id);
      assert.strictEqual(resv.endDate, "2026-11-06");
      assert.strictEqual(resv.unitIndex, 1);
    });

    test("extension is rejected when extended dates conflict with another confirmed booking, preserving original reservation", async () => {
      const prod = await Product.create({
        name: "Conflicted Gown",
        category: "Evening",
        rentPrice: 500,
        price: 2500,
        available: true,
        sizeVariants: [{ size: "S", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Booking 1: 2026-11-01 to 2026-11-03
      const rental1 = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "S",
        rentalStartDate: "2026-11-01",
        originalEndDate: "2026-11-03",
        currentEndDate: "2026-11-03",
        rentalDuration: 2,
        rentalAmount: 1000,
        remainingAmount: 950,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "ACTIVE_RENTAL",
        extensionHistory: [
          {
            requestedEndDate: "2026-11-06", // Requests extension into 11-04 to 11-06
            previousEndDate: "2026-11-03",
            additionalDays: 3,
            additionalAmount: 1500,
            status: "REQUESTED"
          }
        ]
      });
      await reserveRentalSlot(rental1);

      // Booking 2 already confirmed for 2026-11-04 to 2026-11-07 on the only unit (stock = 1)
      const rental2 = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "S",
        rentalStartDate: "2026-11-04",
        originalEndDate: "2026-11-07",
        currentEndDate: "2026-11-07",
        rentalDuration: 3,
        rentalAmount: 1500,
        remainingAmount: 1450,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "CONFIRMED"
      });
      await reserveRentalSlot(rental2);

      // Admin attempts to approve extension for rental1
      const res = await fetch(`${baseUrl}/admin/rentals/${rental1.id}/extension`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ decision: "APPROVED" })
      });

      // Must be rejected with HTTP 400
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /fully booked|cannot be extended/i);

      // Verify original reservation for rental1 is preserved at 2026-11-03
      const freshProd = await Product.findById(prod.id);
      const resv1 = freshProd.activeRentals.find((r) => r.rentalId === rental1.id);
      assert.strictEqual(resv1.endDate, "2026-11-03");

      // Verify rental document currentEndDate was NOT modified
      const recheckRental1 = await Rental.findById(rental1.id);
      assert.strictEqual(recheckRental1.currentEndDate, "2026-11-03");
    });

    test("repeated approval of an already approved extension is safe and idempotent", async () => {
      const prod = await Product.create({
        name: "Idempotent Tuxedo",
        category: "Suits",
        rentPrice: 800,
        price: 4000,
        available: true,
        sizeVariants: [{ size: "L", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "L",
        rentalStartDate: "2026-11-10",
        originalEndDate: "2026-11-12",
        currentEndDate: "2026-11-12",
        rentalDuration: 2,
        rentalAmount: 1600,
        remainingAmount: 1550,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "ACTIVE_RENTAL",
        extensionHistory: [
          {
            requestedEndDate: "2026-11-15",
            previousEndDate: "2026-11-12",
            additionalDays: 3,
            additionalAmount: 2400,
            status: "REQUESTED"
          }
        ]
      });
      await reserveRentalSlot(rental);

      // First approval
      const res1 = await fetch(`${baseUrl}/admin/rentals/${rental.id}/extension`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ decision: "APPROVED" })
      });
      assert.strictEqual(res1.status, 200);

      // Second approval
      const res2 = await fetch(`${baseUrl}/admin/rentals/${rental.id}/extension`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ decision: "APPROVED" })
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.match(data2.message, /already been approved/i);
    });

    test("approving extension on legacy rental without existing activeRentals entry safely creates slot up to extended date", async () => {
      const prod = await Product.create({
        name: "Legacy Lehenga",
        category: "Ethnic",
        rentPrice: 700,
        price: 3500,
        available: true,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        activeRentals: [], // Legacy product: no activeRentals entry initially
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const legacyRental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2026-11-20",
        originalEndDate: "2026-11-22",
        currentEndDate: "2026-11-22",
        rentalDuration: 2,
        rentalAmount: 1400,
        remainingAmount: 1350,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "ACTIVE_RENTAL",
        extensionHistory: [
          {
            requestedEndDate: "2026-11-25",
            previousEndDate: "2026-11-22",
            additionalDays: 3,
            additionalAmount: 2100,
            status: "REQUESTED"
          }
        ]
      });

      // Admin approves extension on legacy rental
      const res = await fetch(`${baseUrl}/admin/rentals/${legacyRental.id}/extension`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ decision: "APPROVED" })
      });
      assert.strictEqual(res.status, 200);

      // Verify product activeRentals entry was created with endDate 2026-11-25
      const freshProd = await Product.findById(prod.id);
      const resv = freshProd.activeRentals.find((r) => r.rentalId === legacyRental.id);
      assert.ok(resv);
      assert.strictEqual(resv.endDate, "2026-11-25");
      assert.strictEqual(resv.unitIndex, 1);
    });
  });

  describe("2. Inventory Stock Updates & Business Rules", () => {
    test("rejects negative or non-integer stock values with HTTP 400", async () => {
      const prod = await Product.create({
        name: "Validation Test Saree",
        category: "Sarees",
        rentPrice: 300,
        price: 1500,
        stock: 3,
        sizeVariants: [{ size: "Free Size", stock: 3, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Negative stock
      const resNeg = await fetch(`${baseUrl}/products/${prod.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ stock: -2 })
      });
      assert.strictEqual(resNeg.status, 400);

      // Decimal stock in sizeVariants
      const resDecimal = await fetch(`${baseUrl}/products/${prod.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sizeVariants: [{ size: "Free Size", stock: 2.5, available: true }]
        })
      });
      assert.strictEqual(resDecimal.status, 400);
    });

    test("prevents removal of a size that has active rental reservations", async () => {
      const prod = await Product.create({
        name: "Multi-Size Anarkali",
        category: "Ethnic",
        rentPrice: 400,
        price: 2000,
        sizeVariants: [
          { size: "S", stock: 2, available: true },
          { size: "M", stock: 2, available: true }
        ],
        activeRentals: [
          {
            rentalId: new mongoose.Types.ObjectId().toString(),
            size: "M",
            unitIndex: 1,
            startDate: "2026-12-01",
            endDate: "2026-12-04"
          }
        ],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Admin attempts to remove size "M", keeping only "S"
      const res = await fetch(`${baseUrl}/products/${prod.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sizeVariants: [{ size: "S", stock: 2, available: true }]
        })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /Cannot remove size 'M'/i);
    });

    test("prevents stock reduction that would invalidate existing unit assignments", async () => {
      const prod = await Product.create({
        name: "High Unit Sherwani",
        category: "Suits",
        rentPrice: 500,
        price: 2500,
        sizeVariants: [{ size: "L", stock: 3, available: true }],
        activeRentals: [
          {
            rentalId: new mongoose.Types.ObjectId().toString(),
            size: "L",
            unitIndex: 2, // Unit 2 is actively assigned
            startDate: "2026-12-10",
            endDate: "2026-12-13"
          }
        ],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Attempt to reduce stock of "L" from 3 to 1 (which would invalidate unit 2)
      const res = await fetch(`${baseUrl}/products/${prod.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sizeVariants: [{ size: "L", stock: 1, available: true }]
        })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /Physical unit 2 is currently assigned/i);
    });

    test("permits stock increase, unchanged stock, and safe reduction without disturbing reservations", async () => {
      const rentalId = new mongoose.Types.ObjectId().toString();
      const prod = await Product.create({
        name: "Safe Stock Blazer",
        category: "Suits",
        rentPrice: 400,
        price: 2000,
        sizeVariants: [{ size: "M", stock: 3, available: true }],
        activeRentals: [
          {
            rentalId,
            size: "M",
            unitIndex: 1,
            startDate: "2026-12-15",
            endDate: "2026-12-18"
          }
        ],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Increase stock from 3 to 5
      const resInc = await fetch(`${baseUrl}/products/${prod.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sizeVariants: [{ size: "M", stock: 5, available: true }]
        })
      });
      assert.strictEqual(resInc.status, 200);

      // Verify activeRentals is preserved
      let freshProd = await Product.findById(prod.id);
      assert.strictEqual(freshProd.activeRentals.length, 1);
      assert.strictEqual(freshProd.activeRentals[0].rentalId, rentalId);

      // Safe reduction from 5 to 2 (unit 1 is assigned, 2 >= 1 is safe)
      const resRed = await fetch(`${baseUrl}/products/${prod.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sizeVariants: [{ size: "M", stock: 2, available: true }]
        })
      });
      assert.strictEqual(resRed.status, 200);
    });

    test("products with no reservations can freely change stock and sizes", async () => {
      const prod = await Product.create({
        name: "Unreserved Dress",
        category: "Dresses",
        rentPrice: 350,
        price: 1800,
        sizeVariants: [{ size: "S", stock: 4, available: true }],
        activeRentals: [],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const res = await fetch(`${baseUrl}/products/${prod.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sizeVariants: [
            { size: "M", stock: 2, available: true },
            { size: "L", stock: 3, available: true }
          ]
        })
      });
      assert.strictEqual(res.status, 200);
      const freshProd = await Product.findById(prod.id);
      assert.strictEqual(freshProd.stock, 5);
      assert.deepStrictEqual(freshProd.sizes, ["M", "L"]);
    });
  });

  describe("3. Legacy Reservation Reconciliation & Overlap Protection", () => {
    test("reconciliation backfills legacy operational rentals into activeRentals without double counting", async () => {
      const prod = await Product.create({
        name: "Legacy Coexistence Kurta",
        category: "Ethnic",
        rentPrice: 300,
        price: 1500,
        sizeVariants: [{ size: "M", stock: 2, available: true }],
        activeRentals: [], // No reservations yet
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Legacy rental R1 in Rental collection (clothId)
      const legacyRental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2026-12-20",
        originalEndDate: "2026-12-23",
        currentEndDate: "2026-12-23",
        rentalDuration: 3,
        rentalAmount: 900,
        remainingAmount: 850,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "CONFIRMED"
      });

      // Call reconcileLegacyRentals
      await reconcileLegacyRentals(prod);

      // Verify product now has R1 in activeRentals
      let freshProd = await Product.findById(prod.id);
      assert.strictEqual(freshProd.activeRentals.length, 1);
      assert.strictEqual(freshProd.activeRentals[0].rentalId, legacyRental.id);
      assert.strictEqual(freshProd.activeRentals[0].unitIndex, 1);

      // Calling reconcile a second time must NOT double-count
      await reconcileLegacyRentals(freshProd);
      freshProd = await Product.findById(prod.id);
      assert.strictEqual(freshProd.activeRentals.length, 1);
    });

    test("prevents new bookings from using inventory occupied by legacy operational rentals", async () => {
      const prod = await Product.create({
        name: "Sole Unit Legacy Gown",
        category: "Evening",
        rentPrice: 400,
        price: 2000,
        sizeVariants: [{ size: "S", stock: 1, available: true }],
        activeRentals: [], // Legacy product with no activeRentals entry yet
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Legacy operational rental occupying the single unit
      await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "S",
        rentalStartDate: "2026-12-25",
        originalEndDate: "2026-12-28",
        currentEndDate: "2026-12-28",
        rentalDuration: 3,
        rentalAmount: 1200,
        remainingAmount: 1150,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "ACTIVE_RENTAL"
      });

      // New rental attempting to book overlapping dates
      const newRental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "S",
        rentalStartDate: "2026-12-26",
        originalEndDate: "2026-12-29",
        currentEndDate: "2026-12-29",
        rentalDuration: 3,
        rentalAmount: 1200,
        remainingAmount: 1150,
        advanceAmount: 50,
        rentalStatus: "PENDING_ADVANCE"
      });

      // reserveRentalSlot must reject due to legacy booking
      await assert.rejects(
        async () => {
          await reserveRentalSlot(newRental);
        },
        /already fully booked/i
      );
    });
  });

  describe("4. Payment & Rental Lifecycle Consistency", () => {
    test("repeated verification of the same payment is idempotent and does not double-reserve", async () => {
      const prod = await Product.create({
        name: "Idempotent Payment Saree",
        category: "Sarees",
        rentPrice: 500,
        price: 2500,
        sizeVariants: [{ size: "Free Size", stock: 2, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "Free Size",
        rentalStartDate: "2027-01-05",
        originalEndDate: "2027-01-08",
        currentEndDate: "2027-01-08",
        rentalDuration: 3,
        rentalAmount: 1500,
        remainingAmount: 1450,
        advanceAmount: 50,
        rentalStatus: "PENDING_ADVANCE"
      });

      const payment = await Payment.create({
        customerReference: `CM-TEST-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        transactionType: "RENT",
        size: "Free Size",
        rentalId: rental.id,
        expectedAmount: 50,
        totalAmount: 1500,
        status: "Awaiting Confirmation"
      });

      // First verification
      const res1 = await fetch(`${baseUrl}/payments/${payment.id}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirmed: true, transactionReference: "UPI-111" })
      });
      assert.strictEqual(res1.status, 200);

      // Verify 1 reservation on product
      let freshProd = await Product.findById(prod.id);
      assert.strictEqual(freshProd.activeRentals.length, 1);

      // Second verification (repeated)
      const res2 = await fetch(`${baseUrl}/payments/${payment.id}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirmed: true, transactionReference: "UPI-111" })
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.match(data2.message, /already been verified/i);

      // Ensure no duplicate reservation was created
      freshProd = await Product.findById(prod.id);
      assert.strictEqual(freshProd.activeRentals.length, 1);
    });

    test("cannot verify a rejected or cancelled payment record", async () => {
      const prod = await Product.create({
        name: "Cancelled Payment Dress",
        category: "Dresses",
        rentPrice: 300,
        price: 1500,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const payment = await Payment.create({
        customerReference: `CM-CANC-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        transactionType: "RENT",
        size: "M",
        expectedAmount: 50,
        totalAmount: 1500,
        status: "Cancelled"
      });

      const res = await fetch(`${baseUrl}/payments/${payment.id}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirmed: true, transactionReference: "UPI-999" })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /cancelled payment record/i);
    });

    test("cannot reject or cancel a verified payment record", async () => {
      const prod = await Product.create({
        name: "Immutable Verified Saree",
        category: "Sarees",
        rentPrice: 300,
        price: 1500,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const payment = await Payment.create({
        customerReference: `CM-VER-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        transactionType: "RENT",
        size: "M",
        expectedAmount: 50,
        totalAmount: 1500,
        status: "Verified",
        verifiedAt: new Date(),
        verifiedBy: "Admin"
      });

      // Reject attempt
      const resRej = await fetch(`${baseUrl}/payments/${payment.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rejectionReason: "Mistake" })
      });
      assert.strictEqual(resRej.status, 400);

      // Cancel attempt
      const resCanc = await fetch(`${baseUrl}/payments/${payment.id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(resCanc.status, 400);
    });

    test("payment cancellation or rejection does NOT release inventory belonging to a still-confirmed rental", async () => {
      const prod = await Product.create({
        name: "Protected Confirmed Rental",
        category: "Ethnic",
        rentPrice: 400,
        price: 2000,
        sizeVariants: [{ size: "L", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "L",
        rentalStartDate: "2027-01-15",
        originalEndDate: "2027-01-18",
        currentEndDate: "2027-01-18",
        rentalDuration: 3,
        rentalAmount: 1200,
        remainingAmount: 1150,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "CONFIRMED"
      });
      await reserveRentalSlot(rental);

      // A duplicate payment record exists referencing the confirmed rental
      const dupPayment = await Payment.create({
        customerReference: `CM-DUP-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        transactionType: "RENT",
        size: "L",
        rentalId: rental.id,
        expectedAmount: 50,
        totalAmount: 1200,
        status: "Awaiting Payment"
      });

      // Admin cancels the duplicate payment
      const res = await fetch(`${baseUrl}/payments/${dupPayment.id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(res.status, 200);

      // Verify the rental's inventory slot on the product was NOT released!
      const freshProd = await Product.findById(prod.id);
      const resv = freshProd.activeRentals.find((r) => r.rentalId === rental.id);
      assert.ok(resv, "Inventory reservation for confirmed rental must remain intact.");
    });
  });

  describe("5. Reservation Utility Reliability", () => {
    test("releaseRentalSlot returns explicit status and is safe to retry", async () => {
      const prod = await Product.create({
        name: "Release Utility Test",
        category: "Casual",
        rentPrice: 200,
        price: 1000,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        activeRentals: [
          {
            rentalId: "rent_release_123",
            size: "M",
            unitIndex: 1,
            startDate: "2027-02-01",
            endDate: "2027-02-03"
          }
        ],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // First release
      const r1 = await releaseRentalSlot(prod.id, "rent_release_123");
      // Retry release (already gone)
      const r2 = await releaseRentalSlot(prod.id, "rent_release_123");

      assert.strictEqual(r1.success, true);
      assert.strictEqual(r1.released, true);

      assert.strictEqual(r2.success, true);
      assert.strictEqual(r2.released, false);

      // Missing IDs check
      const r3 = await releaseRentalSlot(null, null);
      assert.strictEqual(r3.success, false);
      assert.strictEqual(r3.released, false);
    });
  });

  describe("6. Server-Authoritative Payment Pricing & Input Validation (Fix 1)", () => {
    test("RENT payment ignores client-supplied pricing and calculates DB dailyRate * duration without advance", async () => {
      const prod = await Product.create({
        name: "Authoritative Rent Sherwani",
        category: "Ethnic",
        listingType: "RENT",
        rentPrice: 750,
        price: 5000,
        available: true,
        sizeVariants: [{ size: "L", stock: 3, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Client maliciously supplies totalAmount: 1, expectedAmount: 1, advanceAmount: 1, remainingAmount: 1
      const res = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "RENT",
          size: "L",
          rentalStartDate: "2026-12-01",
          rentalEndDate: "2026-12-05",
          rentalDuration: 4,
          totalAmount: 1,
          expectedAmount: 1,
          advanceAmount: 1,
          remainingAmount: 1
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.totalAmount, 3000); // 750 * 4
      assert.strictEqual(data.data.advanceAmount, 0); // ₹0 advance
      assert.strictEqual(data.data.remainingAmount, 0); // 0 remaining
      assert.strictEqual(data.data.expectedAmount, 3000); // Full payment expected
      assert.strictEqual(data.data.rentalDuration, 4);
    });

    test("BUY payment ignores client-supplied pricing and calculates DB selling price * quantity", async () => {
      const prod = await Product.create({
        name: "Authoritative Resell Kurta",
        category: "Ethnic",
        listingType: "RESELL",
        rentPrice: 0,
        price: 1200,
        available: true,
        sizeVariants: [{ size: "XL", stock: 5, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Client maliciously supplies totalAmount: 10, expectedAmount: 10
      const res = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "BUY",
          size: "XL",
          quantity: 3,
          totalAmount: 10,
          expectedAmount: 10
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.totalAmount, 3600); // 1200 * 3
      assert.strictEqual(data.data.expectedAmount, 3600);
      assert.strictEqual(data.data.advanceAmount, 0);
      assert.strictEqual(data.data.remainingAmount, 0);
      assert.strictEqual(data.data.quantity, 3);
    });

    test("rejects RENT on RESELL-only item and BUY on RENT-only item", async () => {
      const resellOnly = await Product.create({
        name: "Resell Exclusive Item",
        category: "Ethnic",
        listingType: "RESELL",
        rentPrice: 0,
        price: 2000,
        available: true,
        sizeVariants: [{ size: "M", stock: 2, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rentOnly = await Product.create({
        name: "Rent Exclusive Item",
        category: "Ethnic",
        listingType: "RENT",
        rentPrice: 500,
        price: 0,
        available: true,
        sizeVariants: [{ size: "M", stock: 2, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Try renting resell-only product
      const res1 = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: resellOnly.id,
          transactionType: "RENT",
          size: "M",
          rentalDuration: 2
        })
      });
      assert.strictEqual(res1.status, 400);
      const data1 = await res1.json();
      assert.match(data1.message, /not available for rental/i);

      // Try buying rent-only product
      const res2 = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: rentOnly.id,
          transactionType: "BUY",
          size: "M",
          quantity: 1
        })
      });
      assert.strictEqual(res2.status, 400);
      const data2 = await res2.json();
      assert.match(data2.message, /not available for purchase/i);
    });

    test("rejects invalid quantity, duration, dates, unoffered size, and insufficient inventory", async () => {
      const prod = await Product.create({
        name: "Strict Validation Cloth",
        category: "Ethnic",
        listingType: "BOTH",
        rentPrice: 400,
        price: 2000,
        available: true,
        sizeVariants: [
          { size: "S", stock: 1, available: true },
          { size: "M", stock: 0, available: true },
          { size: "L", stock: 2, available: false }
        ],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Invalid quantity for BUY: negative or > 50
      const resQty = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "BUY",
          size: "S",
          quantity: -5
        })
      });
      assert.strictEqual(resQty.status, 400);

      // Buy quantity exceeds stock (stock is 1, asking 2)
      const resExcess = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "BUY",
          size: "S",
          quantity: 2
        })
      });
      assert.strictEqual(resExcess.status, 400);
      const dataExcess = await resExcess.json();
      assert.match(dataExcess.message, /exceeds available stock/i);

      // Unoffered size "XXL"
      const resSize = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "BUY",
          size: "XXL",
          quantity: 1
        })
      });
      assert.strictEqual(resSize.status, 400);
      const dataSize = await resSize.json();
      assert.match(dataSize.message, /not offered/i);

      // Out of stock size "M" for RENT
      const resStock = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "RENT",
          size: "M",
          rentalDuration: 1
        })
      });
      assert.strictEqual(resStock.status, 400);
      const dataStock = await resStock.json();
      assert.match(dataStock.message, /out of stock/i);

      // Unavailable size "L"
      const resUnavail = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "RENT",
          size: "L",
          rentalDuration: 1
        })
      });
      assert.strictEqual(resUnavail.status, 400);

      // Rental dates mismatch duration
      const resDateMismatch = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "RENT",
          size: "S",
          rentalStartDate: "2026-11-01",
          rentalEndDate: "2026-11-04", // 3 days
          rentalDuration: 5 // Conflict!
        })
      });
      assert.strictEqual(resDateMismatch.status, 400);

      // End date before start date
      const resInverted = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "RENT",
          size: "S",
          rentalStartDate: "2026-11-10",
          rentalEndDate: "2026-11-05"
        })
      });
      assert.strictEqual(resInverted.status, 400);
    });

    test("non-admin caller cannot impersonate customer identity, set admin notes, or inject rentalId", async () => {
      const prod = await Product.create({
        name: "Security Identity Cloth",
        category: "Ethnic",
        listingType: "RENT",
        rentPrice: 350,
        price: 1500,
        available: true,
        sizeVariants: [{ size: "M", stock: 2, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      // Anonymous visitor tries to pass customerId, adminNotes, rentalId
      const resAnon = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "RENT",
          size: "M",
          rentalDuration: 2,
          customerId: "attacker_spoofed_user_id",
          adminNotes: "Secret discount approved by admin",
          rentalId: "foreign_rental_id"
        })
      });
      assert.strictEqual(resAnon.status, 200);
      const dataAnon = await resAnon.json();
      assert.strictEqual(dataAnon.data.customerId, ""); // Spoofed customerId cleared
      assert.strictEqual(dataAnon.data.adminNotes, ""); // Admin notes cleared
      assert.strictEqual(dataAnon.data.rentalId, undefined); // Arbitrary rentalId ignored

      // Authenticated customer gets forced to their own userId
      const resCust = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: prod.id,
          transactionType: "RENT",
          size: "M",
          rentalDuration: 2,
          customerId: "target_victim_user_id",
          adminNotes: "Fake admin note"
        })
      });
      assert.strictEqual(resCust.status, 200);
      const dataCust = await resCust.json();
      assert.strictEqual(dataCust.data.customerId, customerUser.id); // Bound to authenticated user
      assert.strictEqual(dataCust.data.adminNotes, ""); // Admin notes cleared
    });

    test("existing-payment deduplication cannot be abused to update another customer's payment", async () => {
      const prod = await Product.create({
        name: "Cross Customer Isolation Kurta",
        category: "Ethnic",
        listingType: "RENT",
        rentPrice: 400,
        price: 2000,
        available: true,
        sizeVariants: [{ size: "M", stock: 3, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const userAPaymentRef = `CM-USERA-${Date.now()}`;
      // Customer A creates initial payment record
      const resA = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerReference: userAPaymentRef,
          productId: prod.id,
          transactionType: "RENT",
          size: "M",
          rentalDuration: 2
        })
      });
      assert.strictEqual(resA.status, 200);
      const dataA = await resA.json();
      assert.strictEqual(dataA.data.customerReference, userAPaymentRef);
      assert.strictEqual(dataA.data.totalAmount, 800); // 400 * 2

      // Create a second user (Customer B)
      const userBPassword = await bcrypt.hash("Password@123", 10);
      const userB = await User.create({
        name: "Customer B",
        email: `cust_b_${Date.now()}@test.com`,
        password: userBPassword,
        role: "user"
      });
      const userBToken = signAccessToken(userB);

      // Customer B attempts to supply Customer A's customerReference to tamper with Customer A's payment
      const resB = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userBToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerReference: userAPaymentRef,
          productId: prod.id,
          transactionType: "RENT",
          size: "M",
          rentalDuration: 5 // Tampered duration
        })
      });
      assert.strictEqual(resB.status, 200);
      const dataB = await resB.json();

      // Customer B must NOT have modified Customer A's record!
      const freshUserAPayment = await Payment.findOne({ customerReference: userAPaymentRef });
      assert.strictEqual(freshUserAPayment.customerId, customerUser.id);
      assert.strictEqual(freshUserAPayment.rentalDuration, 2, "Customer A's duration must remain untouched");
      assert.strictEqual(freshUserAPayment.totalAmount, 800, "Customer A's total must remain untouched");

      // Customer B receives an isolated record with a distinct reference
      assert.notStrictEqual(dataB.data._id, dataA.data._id, "Customer B must receive a separate payment record");
      assert.strictEqual(dataB.data.customerId, userB.id);
    });
  });

  describe("7. MongoDB Reservation Query Bug Verification (Fix 2)", () => {
    test("reserveRentalSlot prevents duplicate reservation of the same rental ID", async () => {
      const prod = await Product.create({
        name: "Duplicate Prevention Product",
        category: "Ethnic",
        rentPrice: 500,
        price: 2500,
        available: true,
        sizeVariants: [{ size: "M", stock: 2, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rentalObj = {
        _id: new mongoose.Types.ObjectId(),
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2026-12-10",
        currentEndDate: "2026-12-12"
      };

      // First reservation
      const r1 = await reserveRentalSlot(rentalObj);
      assert.strictEqual(r1.success, true);

      // Second reservation of the exact same rental ID
      const r2 = await reserveRentalSlot(rentalObj);
      assert.strictEqual(r2.success, true);
      assert.strictEqual(r2.alreadyReserved, true);

      // Verify Product.activeRentals has exactly 1 entry for this rentalId
      const freshProd = await Product.findById(prod.id);
      const matching = freshProd.activeRentals.filter((r) => String(r.rentalId) === String(rentalObj._id));
      assert.strictEqual(matching.length, 1);
    });

    test("reserveRentalSlot blocks overlapping reservations when all units are occupied", async () => {
      const prod = await Product.create({
        name: "Unit Capacity Product",
        category: "Ethnic",
        rentPrice: 500,
        price: 2500,
        available: true,
        sizeVariants: [{ size: "S", stock: 1, available: true }], // Only 1 unit!
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const r1 = await reserveRentalSlot({
        _id: new mongoose.Types.ObjectId(),
        clothId: prod.id,
        size: "S",
        rentalStartDate: "2026-12-15",
        currentEndDate: "2026-12-18"
      });
      assert.strictEqual(r1.success, true);
      assert.strictEqual(r1.unitIndex, 1);

      // Second rental with overlapping date range must fail
      await assert.rejects(
        async () => {
          await reserveRentalSlot({
            _id: new mongoose.Types.ObjectId(),
            clothId: prod.id,
            size: "S",
            rentalStartDate: "2026-12-16",
            currentEndDate: "2026-12-20"
          });
        },
        /fully booked/i
      );

      // Non-overlapping date range on the same unit must succeed
      const r3 = await reserveRentalSlot({
        _id: new mongoose.Types.ObjectId(),
        clothId: prod.id,
        size: "S",
        rentalStartDate: "2026-12-22",
        currentEndDate: "2026-12-25"
      });
      assert.strictEqual(r3.success, true);
      assert.strictEqual(r3.unitIndex, 1);
    });
  });

  describe("8. Conditional Verification Compensation & Transition Guards (Fix 3)", () => {
    test("rejectPayment rejects transition if payment is already cancelled, verified, or rejected", async () => {
      const prod = await Product.create({
        name: "Transition Test Product",
        category: "Ethnic",
        rentPrice: 300,
        price: 1500,
        available: true,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const cancelledPay = await Payment.create({
        customerReference: `CM-CANC-GUARD-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        transactionType: "BUY",
        size: "M",
        expectedAmount: 1500,
        totalAmount: 1500,
        status: "Cancelled"
      });

      // Attempt to reject a cancelled payment
      const resRejCanc = await fetch(`${baseUrl}/payments/${cancelledPay.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rejectionReason: "No funds" })
      });
      assert.strictEqual(resRejCanc.status, 400);
      const dataRejCanc = await resRejCanc.json();
      assert.match(dataRejCanc.message, /already been cancelled/i);

      // Attempt to cancel a rejected payment
      const rejectedPay = await Payment.create({
        customerReference: `CM-REJ-GUARD-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        transactionType: "BUY",
        size: "M",
        expectedAmount: 1500,
        totalAmount: 1500,
        status: "Rejected",
        rejectionReason: "Invalid UTR"
      });

      const resCancRej = await fetch(`${baseUrl}/payments/${rejectedPay.id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(resCancRej.status, 400);
      const dataCancRej = await resCancRej.json();
      assert.match(dataCancRej.message, /already been rejected/i);
    });

    test("conditional compensation in verifyPayment only reverts rentals transitioned by this operation", async () => {
      const prod = await Product.create({
        name: "Compensation Test Dress",
        category: "Ethnic",
        rentPrice: 400,
        price: 2000,
        available: true,
        sizeVariants: [{ size: "M", stock: 2, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2027-01-01",
        originalEndDate: "2027-01-03",
        currentEndDate: "2027-01-03",
        rentalDuration: 2,
        rentalAmount: 800,
        remainingAmount: 750,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_PENDING",
        rentalStatus: "PENDING_ADVANCE"
      });

      const payment = await Payment.create({
        customerReference: `CM-COMP-TEST-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        transactionType: "RENT",
        size: "M",
        rentalId: rental.id,
        expectedAmount: 50,
        totalAmount: 800,
        advanceAmount: 50,
        remainingAmount: 750,
        status: "Cancelled" // Payment is already Cancelled!
      });

      // verifyPayment should fail because payment is Cancelled
      const res = await fetch(`${baseUrl}/payments/${payment.id}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirmed: true })
      });
      assert.strictEqual(res.status, 400);

      // Verify the rental was NOT modified or corrupted
      const freshRental = await Rental.findById(rental.id);
      assert.strictEqual(freshRental.advanceStatus, "ADVANCE_PENDING");
      assert.strictEqual(freshRental.rentalStatus, "PENDING_ADVANCE");
    });
  });

  describe("9. Admin Rental Cancellation Lifecycle & Recovery (Fix 4)", () => {
    test("cancelling an eligible rental releases reservation slot and cancels pending payments", async () => {
      const prod = await Product.create({
        name: "Eligible Cancel Dress",
        category: "Ethnic",
        rentPrice: 350,
        price: 1800,
        available: true,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2027-02-01",
        originalEndDate: "2027-02-04",
        currentEndDate: "2027-02-04",
        rentalDuration: 3,
        rentalAmount: 1050,
        remainingAmount: 1000,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "CONFIRMED"
      });

      // Reserve slot on product
      await reserveRentalSlot(rental);
      let prodWithRes = await Product.findById(prod.id);
      assert.strictEqual(prodWithRes.activeRentals.length, 1);

      // Create a pending payment linked to this rental
      const pendingPayment = await Payment.create({
        customerReference: `CM-CANCEL-LINK-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        transactionType: "RENT",
        size: "M",
        rentalId: rental.id,
        expectedAmount: 50,
        totalAmount: 1050,
        advanceAmount: 50,
        remainingAmount: 1000,
        status: "Payment Reported"
      });

      // Admin cancels rental
      const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.rentalStatus, "CANCELLED");

      // Verify product activeRentals slot was released
      const updatedProd = await Product.findById(prod.id);
      assert.strictEqual(updatedProd.activeRentals.length, 0);

      // Verify linked payment was updated to Cancelled
      const updatedPay = await Payment.findById(pendingPayment.id);
      assert.strictEqual(updatedPay.status, "Cancelled");
    });

    test("cancelling a completed or already-cancelled rental returns 400", async () => {
      const prod = await Product.create({
        name: "Completed Rental Gown",
        category: "Evening",
        rentPrice: 500,
        price: 2500,
        available: true,
        sizeVariants: [{ size: "L", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const completedRental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "L",
        rentalStartDate: "2026-05-01",
        originalEndDate: "2026-05-03",
        currentEndDate: "2026-05-03",
        rentalDuration: 2,
        rentalAmount: 1000,
        remainingAmount: 950,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "COMPLETED"
      });

      const resCompleted = await fetch(`${baseUrl}/admin/rentals/${completedRental.id}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(resCompleted.status, 400);
      const dataCompleted = await resCompleted.json();
      assert.match(dataCompleted.message, /cannot cancel a completed rental/i);

      const cancelledRental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "L",
        rentalStartDate: "2026-06-01",
        originalEndDate: "2026-06-03",
        currentEndDate: "2026-06-03",
        rentalDuration: 2,
        rentalAmount: 1000,
        remainingAmount: 950,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_PENDING",
        rentalStatus: "CANCELLED"
      });

      const resCancelled = await fetch(`${baseUrl}/admin/rentals/${cancelledRental.id}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(resCancelled.status, 400);
      const dataCancelled = await resCancelled.json();
      assert.match(dataCancelled.message, /already cancelled/i);
    });

    test("cancelling an operational rental returns 400 and preserves inventory reservation", async () => {
      const prod = await Product.create({
        name: "Active Operational Kurta",
        category: "Ethnic",
        rentPrice: 300,
        price: 1500,
        available: true,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const operationalRental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2027-03-01",
        originalEndDate: "2027-03-05",
        currentEndDate: "2027-03-05",
        rentalDuration: 4,
        rentalAmount: 1200,
        remainingAmount: 1150,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "ACTIVE_RENTAL"
      });

      // Reserve on product
      await reserveRentalSlot(operationalRental);
      let prodBefore = await Product.findById(prod.id);
      assert.strictEqual(prodBefore.activeRentals.length, 1);

      // Attempt cancellation
      const res = await fetch(`${baseUrl}/admin/rentals/${operationalRental.id}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /cannot cancel an operational rental/i);

      // Product activeRentals must remain untouched!
      const prodAfter = await Product.findById(prod.id);
      assert.strictEqual(prodAfter.activeRentals.length, 1);
      assert.strictEqual(prodAfter.activeRentals[0].rentalId, operationalRental.id);
    });

    test("two simultaneous cancellation requests result in exactly one 200 and one 400", async () => {
      const prod = await Product.create({
        name: "Concurrent Cancellation Sherwani",
        category: "Ethnic",
        rentPrice: 600,
        price: 3000,
        available: true,
        sizeVariants: [{ size: "XL", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "XL",
        rentalStartDate: "2027-04-01",
        originalEndDate: "2027-04-03",
        currentEndDate: "2027-04-03",
        rentalDuration: 2,
        rentalAmount: 1200,
        remainingAmount: 1150,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "CONFIRMED"
      });

      await reserveRentalSlot(rental);

      // Fire simultaneous cancellation requests
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/admin/rentals/${rental.id}/cancel`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json"
          }
        }),
        fetch(`${baseUrl}/admin/rentals/${rental.id}/cancel`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json"
          }
        })
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(statuses, [200, 400], "Exactly one cancellation must succeed (200) and one must be rejected (400)");

      // Final rental status must be CANCELLED
      const freshRental = await Rental.findById(rental.id);
      assert.strictEqual(freshRental.rentalStatus, "CANCELLED");

      // Product activeRentals must be empty
      const freshProd = await Product.findById(prod.id);
      assert.strictEqual(freshProd.activeRentals.length, 0);
    });

    test("reservation-release failure aborts cancellation and rolls back rental status", async () => {
      const prod = await Product.create({
        name: "Rollback Test Anarkali",
        category: "Ethnic",
        rentPrice: 450,
        price: 2200,
        available: true,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2027-05-01",
        originalEndDate: "2027-05-04",
        currentEndDate: "2027-05-04",
        rentalDuration: 3,
        rentalAmount: 1350,
        remainingAmount: 1300,
        advanceAmount: 50,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "CONFIRMED"
      });

      await reserveRentalSlot(rental);

      // Temporarily mock Product.updateOne to throw an error simulating inventory failure
      const originalUpdateOne = Product.updateOne;
      Product.updateOne = async () => {
        throw new Error("Simulated database write error during inventory release");
      };

      try {
        const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/cancel`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json"
          }
        });

        assert.strictEqual(res.status, 500);
        const data = await res.json();
        assert.match(data.message, /failed to release inventory reservation/i);

        // Verify rental status was rolled back to original CONFIRMED status
        const freshRental = await Rental.findById(rental.id);
        assert.strictEqual(freshRental.rentalStatus, "CONFIRMED");
      } finally {
        Product.updateOne = originalUpdateOne;
      }
    });
  });

  describe("10. Rental Payment Confirmation, Product Return & Role Authorization", () => {
    test("Admin marks payment received: confirms rental, reserves slot, syncs Payment", async () => {
      const prod = await Product.create({
        name: "Payment Received Test Sherwani",
        category: "Ethnic",
        rentPrice: 800,
        price: 5000,
        available: true,
        sizeVariants: [{ size: "XL", stock: 2, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "XL",
        rentalStartDate: "2027-06-01",
        originalEndDate: "2027-06-04",
        currentEndDate: "2027-06-04",
        rentalDuration: 3,
        rentalAmount: 2400,
        advanceAmount: 0,
        remainingAmount: 0,
        advanceStatus: "ADVANCE_PENDING",
        rentalStatus: "PENDING_ADVANCE"
      });

      const payment = await Payment.create({
        customerReference: "REF-TEST-PAY-001",
        productId: prod.id,
        productName: prod.name,
        rentalId: rental.id,
        userId: customerUser.id,
        transactionType: "RENT",
        totalAmount: 2400,
        expectedAmount: 2400,
        advanceAmount: 0,
        remainingAmount: 0,
        rentalDuration: 3,
        rentalStartDate: "2027-06-01",
        rentalEndDate: "2027-06-04",
        size: "XL",
        status: "Awaiting Payment"
      });

      const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/payment-received`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.rentalStatus, "CONFIRMED");
      assert.strictEqual(json.data.advanceStatus, "ADVANCE_RECEIVED");
      assert.strictEqual(json.data.rentalAmount, 2400);

      // Verify inventory reservation was created
      const freshProd = await Product.findById(prod.id);
      const slot = (freshProd.activeRentals || []).find((r) => r.rentalId.toString() === rental.id.toString());
      assert.ok(slot, "Active rental slot must be reserved on payment confirmation");

      // Verify linked payment is marked Verified
      const freshPayment = await Payment.findById(payment.id);
      assert.strictEqual(freshPayment.status, "Verified");
    });

    test("Duplicate payment confirmation is rejected with 400", async () => {
      const prod = await Product.create({
        name: "Dup Payment Test Lehenga",
        category: "Ethnic",
        rentPrice: 600,
        price: 4000,
        available: true,
        sizeVariants: [{ size: "M", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2027-06-10",
        originalEndDate: "2027-06-13",
        currentEndDate: "2027-06-13",
        rentalDuration: 3,
        rentalAmount: 1800,
        advanceAmount: 0,
        remainingAmount: 0,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "CONFIRMED"
      });

      const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/payment-received`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /already (marked|been recorded) as received/i);
    });

    test("Payment confirmation on CANCELLED or COMPLETED rental is rejected with 400", async () => {
      const prod = await Product.create({
        name: "Cancelled Rental Pay Test",
        category: "Ethnic",
        rentPrice: 500,
        price: 3000,
        available: true,
        sizeVariants: [{ size: "S", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "S",
        rentalStartDate: "2027-07-01",
        originalEndDate: "2027-07-03",
        currentEndDate: "2027-07-03",
        rentalDuration: 2,
        rentalAmount: 1000,
        rentalStatus: "CANCELLED",
        advanceStatus: "ADVANCE_PENDING"
      });

      const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/payment-received`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /cannot confirm payment for a (cancelled|completed) rental/i);
    });

    test("Mark product received: sets COMPLETED, productReceived: true, releases inventory slot", async () => {
      const prod = await Product.create({
        name: "Return Item Test Tuxedo",
        category: "Suits",
        rentPrice: 900,
        price: 6000,
        available: true,
        sizeVariants: [{ size: "L", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "L",
        rentalStartDate: "2027-08-01",
        originalEndDate: "2027-08-04",
        currentEndDate: "2027-08-04",
        rentalDuration: 3,
        rentalAmount: 2700,
        advanceAmount: 0,
        remainingAmount: 0,
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "ACTIVE_RENTAL"
      });

      await reserveRentalSlot(rental);

      // Verify slot exists before product return
      let freshProd = await Product.findById(prod.id);
      assert.strictEqual((freshProd.activeRentals || []).length, 1);

      const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/product-received`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.rentalStatus, "COMPLETED");
      assert.strictEqual(json.data.productReceived, true);
      assert.ok(json.data.productReceivedAt);

      // Verify inventory slot was released
      freshProd = await Product.findById(prod.id);
      const slot = (freshProd.activeRentals || []).find((r) => r.rentalId.toString() === rental.id.toString());
      assert.strictEqual(slot, undefined, "Slot must be released after product return");
    });

    test("Mark product received is rejected for unpaid rental (PENDING_ADVANCE)", async () => {
      const prod = await Product.create({
        name: "Unpaid Return Test Kurta",
        category: "Ethnic",
        rentPrice: 400,
        price: 2000,
        available: true,
        sizeVariants: [{ size: "M", stock: 2, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "M",
        rentalStartDate: "2027-08-10",
        originalEndDate: "2027-08-12",
        currentEndDate: "2027-08-12",
        rentalDuration: 2,
        rentalAmount: 800,
        advanceAmount: 0,
        remainingAmount: 0,
        advanceStatus: "ADVANCE_PENDING",
        rentalStatus: "PENDING_ADVANCE"
      });

      const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/product-received`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /payment must be confirmed/i);
    });

    test("Customer is rejected with 403 when trying to mark payment or product received", async () => {
      const prod = await Product.create({
        name: "RBAC Security Test Sherwani",
        category: "Ethnic",
        rentPrice: 500,
        price: 2500,
        available: true,
        sizeVariants: [{ size: "S", stock: 1, available: true }],
        images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
      });

      const rental = await Rental.create({
        userId: customerUser.id,
        clothId: prod.id,
        size: "S",
        rentalStartDate: "2027-09-01",
        originalEndDate: "2027-09-03",
        currentEndDate: "2027-09-03",
        rentalDuration: 2,
        rentalAmount: 1000,
        rentalStatus: "PENDING_ADVANCE"
      });

      // Customer tries to mark payment received
      const payRes = await fetch(`${baseUrl}/admin/rentals/${rental.id}/payment-received`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(payRes.status, 403);

      // Customer tries to mark product received
      const prodRes = await fetch(`${baseUrl}/admin/rentals/${rental.id}/product-received`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json"
        }
      });
      assert.strictEqual(prodRes.status, 403);
    });
  });
});


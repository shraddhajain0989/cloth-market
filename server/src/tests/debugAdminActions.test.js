import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Rental } from "../models/Rental.js";
import { Product } from "../models/Product.js";
import { Payment } from "../models/Payment.js";
import { AuditLog } from "../models/AuditLog.js";
import {
  confirmPaymentReceived,
  recordHandoverInspection,
  reportDamage,
  startRentPeriod,
  initiateRent,
  resolveDamage,
  markProductReceived
} from "../controllers/adminController.js";

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

function oid() {
  return new mongoose.Types.ObjectId().toString();
}

describe("Admin Updates Validation Tests", () => {
  it("Payment received, Handover inspection, Rent period, Damage report, and Damage resolution all succeed seamlessly", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const prodId = oid();
    const custId = oid();
    const rentId = oid();

    const mockProduct = {
      _id: prodId,
      name: "Bridal Silk Lehenga",
      available: true,
      sizeVariants: [{ size: "M", stock: 2 }],
      activeRentals: []
    };

    const rentalDoc = new Rental({
      _id: rentId,
      userId: custId,
      clothId: prodId,
      productId: prodId,
      productName: "Bridal Silk Lehenga",
      size: "M",
      rentalStartDate: "2026-11-01",
      originalEndDate: "2026-11-04",
      currentEndDate: "2026-11-04",
      rentalDuration: 3,
      rentalAmount: 2400,
      advanceAmount: 0,
      advanceStatus: "ADVANCE_PENDING",
      remainingAmount: 0,
      remainingPaymentStatus: "REMAINING_RECEIVED",
      paymentMethod: "MANUAL_WHATSAPP",
      rentalStatus: "ADDED_TO_CART",
      status: "ADDED_TO_CART"
    });

    rentalDoc.save = async function() { return this; };

    t.mock.method(Product, "findById", async () => mockProduct);
    t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
    t.mock.method(Rental, "find", async () => []);
    t.mock.method(Product, "findOneAndUpdate", async (filter, update) => {
      if (update.$push) {
        mockProduct.activeRentals.push(update.$push.activeRentals);
      }
      if (update.$pull) {
        mockProduct.activeRentals = mockProduct.activeRentals.filter(
          (r) => String(r.rentalId) !== String(update.$pull.activeRentals.rentalId)
        );
      }
      return mockProduct;
    });
    t.mock.method(Payment, "updateMany", async () => ({ modifiedCount: 1 }));
    t.mock.method(Rental, "findById", async (id) => (String(id) === String(rentId) ? rentalDoc : null));
    t.mock.method(Rental, "findOneAndUpdate", async (filter, update) => {
      Object.assign(rentalDoc, update.$set);
      return rentalDoc;
    });

    const adminUser = { id: "admin_1", name: "Admin Manager", email: "admin@test.com", role: "admin" };

    // 1. Confirm Payment Received (WhatsApp payment verification)
    const payReq = { params: { id: rentId }, user: adminUser };
    const payRes = createMockRes();
    await confirmPaymentReceived(payReq, payRes);

    assert.equal(payRes.statusCode, 200);
    assert.equal(rentalDoc.advanceStatus, "ADVANCE_RECEIVED");
    assert.equal(rentalDoc.rentalStatus, "CONFIRMED");

    // 2. Initiate Rent
    const initReq = { params: { id: rentId }, user: adminUser };
    const initRes = createMockRes();
    await initiateRent(initReq, initRes);

    assert.equal(initRes.statusCode, 200);
    assert.equal(rentalDoc.rentalStatus, "RENT_INITIATED");

    // 3. Handover Inspection
    const handoverReq = {
      params: { id: rentId },
      user: adminUser,
      body: {
        condition: "Pristine",
        stains: false,
        tears: false,
        notes: "Baseline inspection photos recorded at customer counter",
        photos: ["https://example.com/handover1.jpg"]
      }
    };
    const handoverRes = createMockRes();
    await recordHandoverInspection(handoverReq, handoverRes);

    assert.equal(handoverRes.statusCode, 200);
    assert.equal(rentalDoc.handoverInspection.condition, "Pristine");
    assert.equal(rentalDoc.rentalStatus, "HANDOVER_INSPECTION");

    // 4. Start Rent Period
    const startReq = { params: { id: rentId }, user: adminUser };
    const startRes = createMockRes();
    await startRentPeriod(startReq, startRes);

    assert.equal(startRes.statusCode, 200);
    assert.equal(rentalDoc.rentalStatus, "RENT_PERIOD");

    // 5. Report Damage
    const damageReq = {
      params: { id: rentId },
      user: adminUser,
      body: {
        description: "Small tear on dupatta border",
        severity: "minor",
        amount: 350,
        photos: ["https://example.com/damage1.jpg"]
      }
    };
    const damageRes = createMockRes();
    await reportDamage(damageReq, damageRes);

    assert.equal(damageRes.statusCode, 200);
    assert.equal(rentalDoc.damageReport.damageDetected, true);
    assert.equal(rentalDoc.damageReport.amount, 350);
    assert.equal(rentalDoc.rentalStatus, "DAMAGE_REPORTED");

    // 6. Resolve Damage and Complete
    const resolveReq = { params: { id: rentId }, user: adminUser };
    const resolveRes = createMockRes();
    await resolveDamage(resolveReq, resolveRes);

    assert.equal(resolveRes.statusCode, 200);
    assert.equal(rentalDoc.damageReport.status, "DAMAGE_RESOLVED");
    assert.equal(rentalDoc.rentalStatus, "COMPLETED");
  });

  it("Handover inspection succeeds when rental is already CONFIRMED even if advanceStatus was pending", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const rentId = oid();
    const rentalDoc = new Rental({
      _id: rentId,
      userId: oid(),
      clothId: oid(),
      size: "L",
      rentalStartDate: "2026-11-10",
      originalEndDate: "2026-11-13",
      currentEndDate: "2026-11-13",
      rentalDuration: 3,
      rentalAmount: 1500,
      advanceStatus: "ADVANCE_PENDING", // still pending advanceStatus
      rentalStatus: "CONFIRMED" // but already confirmed
    });
    rentalDoc.save = async function() { return this; };

    t.mock.method(Rental, "findById", async () => rentalDoc);

    const adminUser = { id: "admin_1", name: "Admin", role: "admin" };
    const req = {
      params: { id: rentId },
      user: adminUser,
      body: { condition: "Good", notes: "No flaws" }
    };
    const res = createMockRes();

    await recordHandoverInspection(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(rentalDoc.advanceStatus, "ADVANCE_RECEIVED");
    assert.equal(rentalDoc.rentalStatus, "HANDOVER_INSPECTION");
  });
});

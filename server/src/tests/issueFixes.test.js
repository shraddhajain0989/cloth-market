import test, { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Payment } from "../models/Payment.js";
import { Rental } from "../models/Rental.js";
import { Product } from "../models/Product.js";
import { AuditLog } from "../models/AuditLog.js";
import { verifyPayment } from "../controllers/paymentController.js";
import { confirmPaymentReceived } from "../controllers/adminController.js";
import { reserveRentalSlot } from "../utils/rentalReservation.js";

// Disable mongoose buffering so disconnected queries fail fast or don't hang
mongoose.set("bufferCommands", false);

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

describe("ISSUE 1: Payment Verification for Rejected Payments", () => {
  it("A previously rejected payment can be successfully verified and rejection reason is cleared", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const payId = oid();
    const prodId = oid();
    const custId = oid();
    const rentId = oid();

    const paymentDoc = {
      _id: payId,
      id: payId,
      status: "Rejected",
      rejectionReason: "Screenshot blurry",
      transactionType: "RENT",
      productId: prodId,
      customerId: custId,
      size: "M",
      rentalStartDate: "2026-11-01",
      rentalEndDate: "2026-11-05",
      expectedAmount: 1500,
      verifiedBy: null,
      verifiedAt: null
    };

    const linkedRentalDoc = {
      _id: rentId,
      id: rentId,
      clothId: prodId,
      userId: custId,
      size: "M",
      rentalStartDate: "2026-11-01",
      rentalEndDate: "2026-11-05",
      advanceStatus: "PENDING",
      rentalStatus: "ADDED_TO_CART",
      save: async () => linkedRentalDoc
    };

    t.mock.method(Payment, "findById", async (id) => (id === payId ? { ...paymentDoc } : null));
    t.mock.method(Rental, "findById", async () => null);
    t.mock.method(Rental, "findOne", (query) => ({
      sort: async () => ({ ...linkedRentalDoc })
    }));
    t.mock.method(Payment, "updateOne", async () => ({ modifiedCount: 1 }));

    let savedPayment = null;
    t.mock.method(Payment, "findOneAndUpdate", async (filter, update) => {
      // Must not exclude 'Rejected' status
      if (filter.status?.$nin?.includes("Rejected")) {
        return null;
      }
      savedPayment = {
        ...paymentDoc,
        status: update.$set.status,
        rejectionReason: update.$set.rejectionReason,
        verifiedBy: update.$set.verifiedBy,
        verifiedAt: update.$set.verifiedAt
      };
      return savedPayment;
    });

    const mockProduct = {
      _id: prodId,
      name: "Designer Sherwani",
      available: false, // hidden from public browsing
      sizeVariants: [{ size: "M", stock: 2 }],
      activeRentals: []
    };
    t.mock.method(Product, "findById", async () => ({ ...mockProduct, activeRentals: [...mockProduct.activeRentals] }));
    t.mock.method(Rental, "find", async () => []);
    t.mock.method(Product, "findOneAndUpdate", async (filter, update) => {
      mockProduct.activeRentals.push(update.$push.activeRentals);
      return { ...mockProduct };
    });

    const req = {
      params: { id: payId },
      body: { confirmed: true, transactionReference: "UPI-RECHECK-12345" },
      user: { id: "admin_1", email: "admin@clothmarket.com", role: "admin", name: "Super Admin" }
    };
    const res = createMockRes();

    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, "Verified");
    assert.equal(res.body.data.rejectionReason, "", "Previous rejectionReason must be cleared");
    assert.equal(res.body.data.verifiedBy, "Super Admin");
  });

  it("The correct eligible rental is updated when matching customer, product, size, and dates", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const payId = oid();
    const prodId = oid();
    const custId = oid();
    const rentId = oid();

    const paymentDoc = {
      _id: payId,
      id: payId,
      status: "Rejected",
      rejectionReason: "Payment mismatched",
      transactionType: "RENT",
      productId: prodId,
      customerId: custId,
      size: "L",
      rentalStartDate: "2026-11-10",
      rentalEndDate: "2026-11-14",
      expectedAmount: 3000
    };

    let rentalSaved = false;
    const matchingRental = {
      _id: rentId,
      id: rentId,
      clothId: prodId,
      userId: custId,
      size: "L",
      rentalStartDate: "2026-11-10",
      rentalEndDate: "2026-11-14",
      advanceStatus: "PENDING",
      rentalStatus: "ADDED_TO_CART",
      save: async function () {
        rentalSaved = true;
        return this;
      }
    };

    t.mock.method(Payment, "findById", async () => ({ ...paymentDoc }));
    t.mock.method(Rental, "findOne", (query) => ({
      sort: async () => {
        const andArr = query.$and || [];
        const hasUser = andArr.some((c) => c.userId === custId);
        const hasProd = andArr.some((c) => c.$or?.some((p) => p.clothId === prodId || p.productId === prodId));
        if (hasUser && hasProd) {
          return matchingRental;
        }
        return null;
      }
    }));
    t.mock.method(Payment, "updateOne", async () => ({ modifiedCount: 1 }));
    t.mock.method(Payment, "findOneAndUpdate", async (filter, update) => ({
      ...paymentDoc,
      ...update.$set
    }));

    const mockProduct = {
      _id: prodId,
      name: "Royal Lehenga",
      available: true,
      sizeVariants: [{ size: "L", stock: 1 }],
      activeRentals: []
    };
    t.mock.method(Product, "findById", async () => ({ ...mockProduct }));
    t.mock.method(Rental, "find", async () => []);
    t.mock.method(Product, "findOneAndUpdate", async (filter, update) => {
      mockProduct.activeRentals.push(update.$push.activeRentals);
      return { ...mockProduct };
    });

    const req = {
      params: { id: payId },
      body: { confirmed: true },
      user: { id: "admin_1", email: "admin@test.com", role: "admin" }
    };
    const res = createMockRes();

    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(rentalSaved, true, "Linked rental should be saved");
    assert.equal(matchingRental.advanceStatus, "ADVANCE_RECEIVED");
    assert.equal(matchingRental.rentalStatus, "CONFIRMED");
    assert.equal(matchingRental.remainingAmount, 0);
  });

  it("An unrelated rental is never linked to the payment", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const payId = oid();
    const prodId = oid();
    const userA = oid();
    const userB = oid();

    const paymentDoc = {
      _id: payId,
      id: payId,
      status: "Rejected",
      transactionType: "RENT",
      productId: prodId,
      customerId: userA,
      size: "M",
      rentalStartDate: "2026-11-01",
      rentalEndDate: "2026-11-04"
    };

    // Database has a rental, but belonging to userB
    t.mock.method(Payment, "findById", async () => ({ ...paymentDoc }));
    t.mock.method(Rental, "findOne", (query) => ({
      sort: async () => {
        const andArr = query.$and || [];
        const userCondition = andArr.find((c) => c.userId);
        if (userCondition && userCondition.userId === userA) {
          return null; // userA has no rental
        }
        return { _id: oid(), userId: userB, clothId: prodId };
      }
    }));

    let rentalSaveCalled = false;
    t.mock.method(Rental, "findById", async () => ({
      _id: oid(),
      userId: userB,
      clothId: prodId,
      save: async () => {
        rentalSaveCalled = true;
      }
    }));

    t.mock.method(Payment, "findOneAndUpdate", async (filter, update) => ({
      ...paymentDoc,
      ...update.$set
    }));

    const req = {
      params: { id: payId },
      body: { confirmed: true },
      user: { id: "admin_1", email: "admin@test.com", role: "admin" }
    };
    const res = createMockRes();

    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(rentalSaveCalled, false, "Rental belonging to different user must never be updated");
  });

  it("Repeated verification does not create duplicate reservations", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const payId = oid();
    const paymentDoc = {
      _id: payId,
      status: "Verified",
      rentalId: oid()
    };

    t.mock.method(Payment, "findById", async () => ({ ...paymentDoc }));

    const req = {
      params: { id: payId },
      body: { confirmed: true },
      user: { id: "admin_1", email: "admin@test.com", role: "admin" }
    };
    const res = createMockRes();

    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Payment has already been verified.");
  });

  it("Repeated verification on payment with already-confirmed linked rental skips duplicate slot reservation", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const payId = oid();
    const prodId = oid();
    const rentId = oid();
    const custId = oid();

    const paymentDoc = {
      _id: payId,
      id: payId,
      status: "Rejected",
      rejectionReason: "Prior rejection",
      transactionType: "RENT",
      productId: prodId,
      customerId: custId,
      size: "M",
      rentalId: rentId
    };

    const alreadyConfirmedRental = {
      _id: rentId,
      id: rentId,
      clothId: prodId,
      userId: custId,
      size: "M",
      advanceStatus: "ADVANCE_RECEIVED",
      rentalStatus: "CONFIRMED"
    };

    t.mock.method(Payment, "findById", async () => ({ ...paymentDoc }));
    t.mock.method(Rental, "findById", async () => ({ ...alreadyConfirmedRental }));

    let slotReservationCalled = false;
    t.mock.method(Product, "findOneAndUpdate", async () => {
      slotReservationCalled = true;
      return null;
    });

    t.mock.method(Payment, "findOneAndUpdate", async (filter, update) => ({
      ...paymentDoc,
      ...update.$set
    }));

    const req = {
      params: { id: payId },
      body: { confirmed: true },
      user: { id: "admin_1", email: "admin@test.com", role: "admin" }
    };
    const res = createMockRes();

    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.status, "Verified");
    assert.equal(slotReservationCalled, false, "Must not attempt to re-reserve slot on already confirmed rental");
  });
});

describe("ISSUE 2: Mark Payment Operation for Products and Rentals", () => {
  it("Mark Payment succeeds for a legitimate booking when the product is hidden (available = false)", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const prodId = oid();
    const rentId = oid();
    const userId = oid();

    const hiddenProduct = {
      _id: prodId,
      name: "Vintage Silk Saree",
      available: false, // Hidden from public browsing
      sizeVariants: [{ size: "Free", stock: 1 }],
      activeRentals: []
    };

    const rentalDoc = {
      _id: rentId,
      clothId: prodId,
      userId: userId,
      size: "Free",
      rentalStartDate: "2026-11-20",
      rentalEndDate: "2026-11-24",
      advanceStatus: "PENDING",
      rentalStatus: "ADDED_TO_CART"
    };

    t.mock.method(Rental, "findById", async () => ({ ...rentalDoc }));
    t.mock.method(Product, "findById", async () => ({ ...hiddenProduct, activeRentals: [...hiddenProduct.activeRentals] }));
    t.mock.method(Rental, "find", async () => []);

    let assignedRentals = [];
    t.mock.method(Product, "findOneAndUpdate", async (filter, update) => {
      // Ensure filter does NOT reject available: false
      if (filter.available === true) return null;
      assignedRentals = [update.$push.activeRentals];
      return { ...hiddenProduct, activeRentals: assignedRentals };
    });

    let updatedRentalResult = null;
    t.mock.method(Rental, "findOneAndUpdate", async (filter, update) => {
      updatedRentalResult = {
        ...rentalDoc,
        ...update.$set
      };
      return updatedRentalResult;
    });

    t.mock.method(Payment, "updateMany", async () => ({ modifiedCount: 1 }));

    const req = {
      params: { id: rentId },
      user: { id: "admin_1", role: "admin", email: "admin@test.com" }
    };
    const res = createMockRes();

    await confirmPaymentReceived(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(updatedRentalResult.advanceStatus, "ADVANCE_RECEIVED");
    assert.equal(updatedRentalResult.rentalStatus, "CONFIRMED");
    assert.equal(assignedRentals.length, 1);
    assert.equal(assignedRentals[0].rentalId, rentId);
  });

  it("A rental with an already-recorded advance payment can transition to CONFIRMED", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const prodId = oid();
    const rentId = oid();
    const userId = oid();

    // Rental has advanceStatus ADVANCE_RECEIVED but rentalStatus was ADDED_TO_CART
    const rentalDoc = {
      _id: rentId,
      clothId: prodId,
      userId: userId,
      size: "L",
      rentalStartDate: "2026-12-01",
      rentalEndDate: "2026-12-05",
      advanceStatus: "ADVANCE_RECEIVED",
      rentalStatus: "ADDED_TO_CART"
    };

    t.mock.method(Rental, "findById", async () => ({ ...rentalDoc }));
    const mockProduct = {
      _id: prodId,
      name: "Sherwani",
      available: true,
      sizeVariants: [{ size: "L", stock: 1 }],
      activeRentals: []
    };
    t.mock.method(Product, "findById", async () => ({ ...mockProduct, activeRentals: [...mockProduct.activeRentals] }));
    t.mock.method(Rental, "find", async () => []);
    t.mock.method(Product, "findOneAndUpdate", async (filter, update) => {
      mockProduct.activeRentals.push(update.$push.activeRentals);
      return { ...mockProduct };
    });

    let updatedRental = null;
    t.mock.method(Rental, "findOneAndUpdate", async (filter, update) => {
      updatedRental = {
        ...rentalDoc,
        ...update.$set
      };
      return updatedRental;
    });
    t.mock.method(Payment, "updateMany", async () => ({ modifiedCount: 0 }));

    const req = {
      params: { id: rentId },
      user: { id: "admin_1", role: "admin", email: "admin@test.com" }
    };
    const res = createMockRes();

    await confirmPaymentReceived(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(updatedRental.rentalStatus, "CONFIRMED");
  });

  it("Size matching works correctly for valid existing inventory with different casing/whitespace", async (t) => {
    const prodId = oid();
    const rentId = oid();

    const productDoc = {
      _id: prodId,
      name: "Embroidered Kurta",
      available: true,
      sizeVariants: [{ size: "XL", stock: 1 }],
      activeRentals: []
    };

    // Rental requested lowercase with surrounding spaces
    const rental = {
      _id: rentId,
      clothId: prodId,
      size: "  xl  ",
      rentalStartDate: "2026-11-15",
      rentalEndDate: "2026-11-18"
    };

    t.mock.method(Product, "findById", async () => ({ ...productDoc, activeRentals: [...productDoc.activeRentals] }));
    t.mock.method(Rental, "find", async () => []);

    let pushedReservation = null;
    t.mock.method(Product, "findOneAndUpdate", async (filter, update) => {
      pushedReservation = update.$push.activeRentals;
      productDoc.activeRentals.push(pushedReservation);
      return { ...productDoc };
    });

    const reservationResult = await reserveRentalSlot(rental);

    assert.equal(reservationResult.success, true);
    assert.equal(reservationResult.unitIndex, 1);
    assert.equal(pushedReservation.size, "XL", "Canonical size from product variant is stored");
  });

  it("Genuine stock shortages and reservation conflicts are strictly not bypassed", async (t) => {
    const oosProdId = oid();
    const conflictProdId = oid();

    // 1. Stock shortage (stock: 0)
    const outOfStockProduct = {
      _id: oosProdId,
      name: "Out of stock gown",
      available: true,
      sizeVariants: [{ size: "M", stock: 0 }],
      activeRentals: []
    };

    t.mock.method(Product, "findById", async () => ({ ...outOfStockProduct }));
    t.mock.method(Rental, "find", async () => []);

    const rentalOOS = {
      _id: oid(),
      clothId: oosProdId,
      size: "M",
      rentalStartDate: "2026-11-01",
      rentalEndDate: "2026-11-05"
    };

    await assert.rejects(
      async () => {
        await reserveRentalSlot(rentalOOS);
      },
      {
        message: "Size 'M' is currently out of stock."
      }
    );

    // 2. Reservation conflict (stock: 1, already booked for overlapping dates)
    const conflictProduct = {
      _id: conflictProdId,
      name: "Sole Unit Kurta",
      available: true,
      sizeVariants: [{ size: "M", stock: 1 }],
      activeRentals: [
        {
          rentalId: oid(),
          size: "M",
          unitIndex: 1,
          startDate: "2026-11-02",
          endDate: "2026-11-08"
        }
      ]
    };

    t.mock.method(Product, "findById", async () => ({ ...conflictProduct }));
    t.mock.method(Rental, "find", async () => []);
    // Product.findOneAndUpdate returns null because unit 1 overlaps
    t.mock.method(Product, "findOneAndUpdate", async () => null);

    const rentalConflict = {
      _id: oid(),
      clothId: conflictProdId,
      size: "M",
      rentalStartDate: "2026-11-04",
      rentalEndDate: "2026-11-06"
    };

    await assert.rejects(
      async () => {
        await reserveRentalSlot(rentalConflict);
      },
      (err) => {
        assert.match(err.message, /is already fully booked/);
        return true;
      }
    );
  });

  it("Repeated confirmation does not corrupt records or create duplicate reservations", async (t) => {
    t.mock.method(AuditLog, "create", async () => ({}));

    const rentId = oid();
    const alreadyConfirmedRental = {
      _id: rentId,
      clothId: oid(),
      userId: oid(),
      size: "M",
      rentalStartDate: "2026-11-01",
      rentalEndDate: "2026-11-05",
      advanceStatus: "ADVANCE_RECEIVED",
      rentalStatus: "CONFIRMED"
    };

    t.mock.method(Rental, "findById", async () => ({ ...alreadyConfirmedRental }));

    let updateCalled = false;
    t.mock.method(Rental, "findOneAndUpdate", async () => {
      updateCalled = true;
    });

    const req = {
      params: { id: rentId },
      user: { id: "admin_1", role: "admin", email: "admin@test.com" }
    };
    const res = createMockRes();

    await confirmPaymentReceived(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Payment has already been recorded as received.");
    assert.equal(updateCalled, false, "Rental should not be modified if already confirmed");
  });
});

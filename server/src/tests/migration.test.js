import assert from "node:assert";
import test, { before, after, describe } from "node:test";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";
import { runMigration } from "../scripts/migrate.js";

// Derive an isolated test database name so live database is NEVER touched
const rawUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cloth-market-test";
const TEST_MIGRATION_URI = rawUri.includes("/cloth-market?")
  ? rawUri.replace("/cloth-market?", "/cloth-market-migration-test?")
  : rawUri.includes("/cloth-market")
  ? rawUri.replace("/cloth-market", "/cloth-market-migration-test")
  : rawUri;

describe("MIGRATION INTEGRATION TEST — SAFE & IDEMPOTENT RENTAL MIGRATION", () => {
  let createdProductIds = [];
  let legacyRentalIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_MIGRATION_URI);
    }
    // Clean test collection only in test database
    await Product.deleteMany({});
    await User.deleteMany({});
    await Rental.deleteMany({});

    // 1. Seed 29 Products (mimicking production catalog before migration)
    const productDocs = [];
    for (let i = 1; i <= 29; i++) {
      productDocs.push({
        name: `Catalog Cloth Item ${i}`,
        category: i % 2 === 0 ? "Suits" : "Bridal",
        price: 2000 + i * 100,
        rentPrice: 400 + i * 10,
        stock: 10,
        available: true,
        // Some with legacy missing fields
        images: i % 3 === 0 ? [] : ["https://example.com/test.jpg"]
      });
    }
    const insertedProducts = await Product.insertMany(productDocs);
    createdProductIds = insertedProducts.map((p) => String(p._id));

    // 2. Seed 83 Users (mimicking production users)
    const userDocs = [];
    for (let i = 1; i <= 83; i++) {
      userDocs.push({
        name: `User ${i}`,
        email: `migration_user_${i}_${Date.now()}@test.com`,
        password: "Password@123",
        role: "user",
        status: "active"
      });
    }
    await User.insertMany(userDocs);

    // 3. Seed 21 Legacy Rentals via native collection to simulate exact pre-migration state
    // (Bypassing Mongoose pre-save to insert raw legacy schema without clothId)
    const legacyRentals = [];
    for (let i = 1; i <= 21; i++) {
      const isMissingProduct = i === 21; // 21st rental references a deleted/orphaned product
      const targetProductId = isMissingProduct ? new mongoose.Types.ObjectId().toString() : createdProductIds[i % createdProductIds.length];

      legacyRentals.push({
        userId: `usr_legacy_${i}`,
        productId: targetProductId, // Legacy field only! No clothId!
        productName: `Legacy Rented Item ${i}`,
        durationDays: 3,
        total: 500 + i * 50, // Historical price (e.g. ₹550, ₹600...)
        deposit: 1000,
        lateFeePerDay: 150,
        pickupDate: "2026-08-10",
        returnDate: "2026-08-13",
        status: i % 2 === 0 ? "Booked" : "Active",
        reminderStatus: "scheduled",
        damageClaimStatus: "none",
        createdAt: new Date("2026-08-09T10:00:00Z"),
        updatedAt: new Date("2026-08-09T10:00:00Z")
      });
    }

    const insertResult = await Rental.collection.insertMany(legacyRentals);
    legacyRentalIds = Object.values(insertResult.insertedIds).map((id) => String(id));
  });

  after(async () => {
    // Clean up test collections in the isolated test DB
    await Product.deleteMany({});
    await User.deleteMany({});
    await Rental.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  test("Run 1: First migration run successfully migrates legacy rentals without throwing clothId error", async () => {
    const result = await runMigration({
      mongoUri: TEST_MIGRATION_URI,
      autoClose: false,
      keepOpen: true
    });

    assert.strictEqual(result.success, true, "Migration should succeed with 0 unresolved errors");
    assert.strictEqual(result.stats.rentals.inspected, 21, "Must inspect exactly 21 rentals");
    assert.strictEqual(result.stats.rentals.migrated, 21, "All 21 rentals should be safely migrated");
    assert.strictEqual(result.stats.rentals.specialHandling, 1, "The orphaned product rental should be handled under specialHandling");
    assert.strictEqual(result.stats.rentals.unresolved, 0, "No rental should be unresolved");

    // Verify Rental records in DB
    const allRentals = await Rental.find().sort({ createdAt: 1 });
    assert.strictEqual(allRentals.length, 21, "Total rental count must remain exactly 21");

    for (const rental of allRentals) {
      // 1. Verify clothId is now present and equals productId
      assert.ok(rental.clothId, `Rental ${rental._id} must have clothId`);
      assert.strictEqual(rental.clothId, rental.productId);

      // 2. Verify historical price is PRESERVED (NOT overwritten by product rentPrice)
      assert.strictEqual(rental.rentalAmount, rental.total, "Historical rentalAmount must equal original total");
      assert.strictEqual(rental.originalRentalAmount, rental.total);

      // 3. Verify advance and remaining calculation
      assert.strictEqual(rental.advanceAmount, 50, "Advance must be ₹50");
      assert.strictEqual(rental.remainingAmount, rental.rentalAmount - 50, "Remaining amount must equal total - 50");

      // 4. Verify dates mapped
      assert.strictEqual(rental.rentalStartDate, "2026-08-10");
      assert.strictEqual(rental.currentEndDate, "2026-08-13");
      assert.strictEqual(rental.originalEndDate, "2026-08-13");

      // 5. Verify size defaulted safely
      assert.strictEqual(rental.size, "M");

      // 6. Verify status mapping
      assert.strictEqual(rental.advanceStatus, "ADVANCE_RECEIVED");
      assert.ok(["CONFIRMED", "ACTIVE_RENTAL"].includes(rental.rentalStatus));
    }
  });

  test("Run 2: Second migration run is 100% IDEMPOTENT (no duplicates, no re-updates, unchanged prices)", async () => {
    // Record snapshot of rentals before Run 2
    const beforeRun2 = await Rental.find().lean();

    const result2 = await runMigration({
      mongoUri: TEST_MIGRATION_URI,
      autoClose: false,
      keepOpen: true
    });

    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.stats.rentals.inspected, 21);
    assert.strictEqual(result2.stats.rentals.migrated, 0, "Second run should migrate 0 (all already up-to-date)");
    assert.strictEqual(result2.stats.rentals.alreadyMigrated, 21, "All 21 rentals recognized as already migrated");

    const afterRun2 = await Rental.find().lean();
    assert.strictEqual(afterRun2.length, 21, "Total rental count must remain exactly 21");

    // Verify all rental IDs and historical prices are identical
    for (let i = 0; i < beforeRun2.length; i++) {
      const b = beforeRun2[i];
      const a = afterRun2.find((r) => String(r._id) === String(b._id));
      assert.ok(a, `Rental ${b._id} must still exist after second run`);
      assert.strictEqual(a.rentalAmount, b.rentalAmount, "Rental amount must not change on second run");
      assert.strictEqual(a.clothId, b.clothId, "clothId must not change on second run");
      assert.strictEqual(a.remainingAmount, b.remainingAmount);
      assert.strictEqual(a.rentalStartDate, b.rentalStartDate);
    }

    // Verify Products and Users counts
    const productCount = await Product.countDocuments();
    assert.strictEqual(productCount, 29, "Product count must remain exactly 29");

    const userCount = await User.countDocuments();
    assert.strictEqual(userCount, 83, "User count must remain exactly 83");
  });
});

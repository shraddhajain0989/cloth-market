import assert from "node:assert";
import test, { before, after, describe } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { AuditLog } from "../models/AuditLog.js";
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

describe("BULK CLOTH INVENTORY REMOVAL TESTS", () => {
  let userUser, adminUser, masterUser;
  let tokenUser, tokenAdmin, tokenMaster;

  before(async () => {
    userUser = await User.create({
      name: "Renter Normal",
      email: `bulk_user_${Date.now()}@test.com`,
      password: "Password@123",
      role: "user"
    });
    adminUser = await User.create({
      name: "Inventory Admin",
      email: `bulk_admin_${Date.now()}@test.com`,
      password: "Password@123",
      role: "admin"
    });
    masterUser = await User.create({
      name: "Chief Master",
      email: `bulk_master_${Date.now()}@test.com`,
      password: "Password@123",
      role: "master"
    });

    tokenUser = signAccessToken(userUser);
    tokenAdmin = signAccessToken(adminUser);
    tokenMaster = signAccessToken(masterUser);
  });

  // 1. Unauthenticated request is rejected
  test("Unauthenticated request is rejected (401)", async () => {
    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ["60c72b2f9b1d8b2bad000001"] })
    });
    assert.strictEqual(res.status, 401);
  });

  // 2. Normal user cannot bulk remove
  test("Normal user cannot bulk remove (403)", async () => {
    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUser}`
      },
      body: JSON.stringify({ productIds: ["60c72b2f9b1d8b2bad000001"] })
    });
    assert.strictEqual(res.status, 403);
  });

  // 3. Admin can bulk remove safe products
  test("Admin can bulk remove safe products", async () => {
    const prod1 = await Product.create({
      name: "Safe Silk Sherwani A",
      category: "Ethnic",
      rentPrice: 600,
      price: 4000,
      available: true
    });
    const prod2 = await Product.create({
      name: "Safe Silk Sherwani B",
      category: "Ethnic",
      rentPrice: 700,
      price: 5000,
      available: true
    });

    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ productIds: [prod1.id, prod2.id] })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.counts.removed, 2);
    assert.strictEqual(json.data.counts.blocked, 0);

    // Verify both products are now marked available: false
    const check1 = await Product.findById(prod1.id);
    const check2 = await Product.findById(prod2.id);
    assert.strictEqual(check1.available, false);
    assert.strictEqual(check2.available, false);
  });

  // 4. Master Admin can bulk remove safe products
  test("Master Admin can bulk remove safe products", async () => {
    const prod = await Product.create({
      name: "Master Safe Kurta",
      category: "Ethnic",
      rentPrice: 450,
      price: 3000,
      available: true
    });

    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMaster}`
      },
      body: JSON.stringify({ productIds: [prod.id] })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.counts.removed, 1);

    const check = await Product.findById(prod.id);
    assert.strictEqual(check.available, false);
  });

  // 5. Invalid product IDs are handled safely
  test("Invalid product IDs are handled safely", async () => {
    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ productIds: ["not-an-id", "12345", "60c72b2f9b1d8b2bad000000"] })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.counts.removed, 0);
    assert.strictEqual(json.data.counts.blocked, 3);
    assert(json.data.blocked.some((b) => b.reason.includes("Invalid product ID format")));
    assert(json.data.blocked.some((b) => b.reason.includes("not found")));
  });

  // 6. Product with active rental is blocked
  test("Product with active rental is blocked", async () => {
    const activeProd = await Product.create({
      name: "Active Rented Tuxedo",
      category: "Western",
      rentPrice: 900,
      price: 6000,
      available: true
    });

    await Rental.create({
      userId: userUser.id,
      clothId: activeProd.id,
      productId: activeProd.id,
      productName: activeProd.name,
      size: "M",
      rentalStartDate: "2026-10-01",
      currentEndDate: "2026-10-05",
      rentalDuration: 4,
      rentalAmount: 3600,
      advanceAmount: 50,
      remainingAmount: 3550,
      rentalStatus: "ACTIVE_RENTAL",
      clothSnapshot: { name: activeProd.name, rentPrice: activeProd.rentPrice }
    });

    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ productIds: [activeProd.id] })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.counts.removed, 0);
    assert.strictEqual(json.data.counts.blocked, 1);
    assert.strictEqual(json.data.blocked[0].productId, activeProd.id);
    assert(json.data.blocked[0].reason.includes("active or upcoming rental"));

    // Product must still be available
    const check = await Product.findById(activeProd.id);
    assert.strictEqual(check.available, true);
  });

  // 7. Product with pending rental is blocked
  test("Product with pending rental is blocked", async () => {
    const pendingProd = await Product.create({
      name: "Pending Advance Lehenga",
      category: "Ethnic",
      rentPrice: 1200,
      price: 8000,
      available: true
    });

    await Rental.create({
      userId: userUser.id,
      clothId: pendingProd.id,
      productId: pendingProd.id,
      productName: pendingProd.name,
      size: "S",
      rentalStartDate: "2026-10-10",
      currentEndDate: "2026-10-12",
      rentalDuration: 2,
      rentalAmount: 2400,
      advanceAmount: 50,
      remainingAmount: 2350,
      rentalStatus: "PENDING_ADVANCE",
      clothSnapshot: { name: pendingProd.name, rentPrice: pendingProd.rentPrice }
    });

    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ productIds: [pendingProd.id] })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.counts.blocked, 1);
    assert(json.data.blocked[0].reason.includes("PENDING_ADVANCE") || json.data.blocked[0].reason.includes("active or upcoming"));
  });

  // 8. Product with upcoming rental is blocked (CONFIRMED)
  test("Product with upcoming rental is blocked", async () => {
    const confirmedProd = await Product.create({
      name: "Upcoming Confirmed Gown",
      category: "Western",
      rentPrice: 1000,
      price: 7000,
      available: true
    });

    await Rental.create({
      userId: userUser.id,
      clothId: confirmedProd.id,
      productId: confirmedProd.id,
      productName: confirmedProd.name,
      size: "L",
      rentalStartDate: "2026-10-15",
      currentEndDate: "2026-10-18",
      rentalDuration: 3,
      rentalAmount: 3000,
      advanceAmount: 50,
      advanceStatus: "ADVANCE_RECEIVED",
      remainingAmount: 2950,
      rentalStatus: "CONFIRMED",
      clothSnapshot: { name: confirmedProd.name, rentPrice: confirmedProd.rentPrice }
    });

    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ productIds: [confirmedProd.id] })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.counts.blocked, 1);
    assert(json.data.blocked[0].reason.includes("CONFIRMED") || json.data.blocked[0].reason.includes("active or upcoming"));
  });

  // 9 & 10 & 11. Product with only historical/completed rentals remains removable from active inventory, rentals intact
  test("Product with only completed rentals remains removable, historical rentals remain intact and not cascade-deleted", async () => {
    const historicalProd = await Product.create({
      name: "Historical Vintage Blazer",
      category: "Western",
      rentPrice: 500,
      price: 3500,
      available: true
    });

    const historicalRental = await Rental.create({
      userId: userUser.id,
      clothId: historicalProd.id,
      productId: historicalProd.id,
      productName: historicalProd.name,
      size: "M",
      rentalStartDate: "2026-09-01",
      currentEndDate: "2026-09-04",
      rentalDuration: 3,
      rentalAmount: 1500,
      advanceAmount: 50,
      advanceStatus: "ADVANCE_RECEIVED",
      remainingAmount: 1450,
      remainingPaymentStatus: "REMAINING_RECEIVED",
      rentalStatus: "COMPLETED",
      priceSnapshot: { dailyRate: 500, durationDays: 3, totalRental: 1500 },
      clothSnapshot: { name: historicalProd.name, rentPrice: 500 }
    });

    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ productIds: [historicalProd.id] })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.counts.removed, 1);
    assert.strictEqual(json.data.counts.blocked, 0);

    // Product is soft-removed (available: false)
    const checkProd = await Product.findById(historicalProd.id);
    assert.ok(checkProd, "Product document still exists in MongoDB");
    assert.strictEqual(checkProd.available, false);

    // Historical rental document MUST NOT be deleted
    const checkRental = await Rental.findById(historicalRental.id);
    assert.ok(checkRental, "Rental document was NOT cascade-deleted");
    assert.strictEqual(checkRental.rentalStatus, "COMPLETED");
    assert.strictEqual(checkRental.rentalAmount, 1500);
    assert.strictEqual(checkRental.clothId, historicalProd.id);
  });

  // 12. Partial success works
  test("Partial success works (removes safe products while blocking products with active rentals)", async () => {
    const safeProd = await Product.create({
      name: "Partial Safe Item",
      category: "Ethnic",
      rentPrice: 300,
      price: 2000,
      available: true
    });

    const activeProd = await Product.create({
      name: "Partial Blocked Active Item",
      category: "Ethnic",
      rentPrice: 350,
      price: 2500,
      available: true
    });

    await Rental.create({
      userId: userUser.id,
      clothId: activeProd.id,
      productId: activeProd.id,
      productName: activeProd.name,
      size: "M",
      rentalStartDate: "2026-10-01",
      currentEndDate: "2026-10-05",
      rentalDuration: 4,
      rentalAmount: 1400,
      advanceAmount: 50,
      remainingAmount: 1350,
      rentalStatus: "ACTIVE_RENTAL"
    });

    const res = await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ productIds: [safeProd.id, activeProd.id] })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.counts.removed, 1);
    assert.strictEqual(json.data.counts.blocked, 1);
    assert.strictEqual(json.data.removed[0].productId, safeProd.id);
    assert.strictEqual(json.data.blocked[0].productId, activeProd.id);

    // Safe product is deactivated; Active product remains active
    const checkSafe = await Product.findById(safeProd.id);
    const checkActive = await Product.findById(activeProd.id);
    assert.strictEqual(checkSafe.available, false);
    assert.strictEqual(checkActive.available, true);
  });

  // 13. Audit log is created
  test("Audit log is created for BULK_REMOVE_PRODUCTS", async () => {
    const auditProd = await Product.create({
      name: "Audit Log Test Item",
      category: "Western",
      rentPrice: 400,
      price: 2500,
      available: true
    });

    await fetch(`${baseUrl}/admin/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ productIds: [auditProd.id] })
    });

    const log = await AuditLog.findOne({
      action: "BULK_REMOVE_PRODUCTS",
      targetType: "product"
    }).sort({ createdAt: -1 });

    assert.ok(log, "AuditLog document created");
    assert.strictEqual(log.actorId, adminUser.id);
    assert.strictEqual(log.actorRole, "admin");
    assert(log.metadata.removedProductIds.includes(auditProd.id));
  });

  // 14. Existing single-product removal still works
  test("Existing single-product removal still works", async () => {
    const singleProd = await Product.create({
      name: "Single Remove Item",
      category: "Western",
      rentPrice: 500,
      price: 3000,
      available: true
    });

    const res = await fetch(`${baseUrl}/products/${singleProd.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAdmin}`
      }
    });

    assert.strictEqual(res.status, 200);
    const check = await Product.findById(singleProd.id);
    assert.strictEqual(check, null, "Item with 0 rentals was deleted");
  });
});

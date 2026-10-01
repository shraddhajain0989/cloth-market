import assert from "node:assert";
import test, { before, after, describe } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Rental } from "../models/Rental.js";
import { SocialPost } from "../models/SocialPost.js";
import { signAccessToken } from "../utils/tokens.js";

let server;
let baseUrl;
let app;

// Test DB setup using local or test MongoDB string
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

describe("1. AUTHENTICATION & SECURITY TESTS", () => {
  const testEmail = `test_${Date.now()}@example.com`;

  test("Reject weak password (< 6 chars)", async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Weak Pwd", email: "weak@example.com", password: "123" })
    });
    assert.strictEqual(res.status, 400);
  });

  test("Register new valid user", async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test User", email: testEmail, password: "SecureUser@123" })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.user.email, testEmail);
  });

  test("Reject duplicate email signup", async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dup User", email: testEmail, password: "SecureUser@123" })
    });
    assert.strictEqual(res.status, 409);
  });

  test("Login with valid credentials", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "SecureUser@123" })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(json.data.accessToken);
  });

  test("Reject wrong password login", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword" })
    });
    assert.strictEqual(res.status, 401);
  });
});

describe("2. AUTHORIZATION & IDOR ATTACK TESTS", () => {
  let userA, userB, tokenA;

  before(async () => {
    userA = await User.create({ name: "User A", email: `usera_${Date.now()}@example.com`, password: "Password@123", role: "user" });
    userB = await User.create({ name: "User B", email: `userb_${Date.now()}@example.com`, password: "Password@123", role: "user" });
    tokenA = signAccessToken(userA);
  });

  test("Normal user cannot access Admin Dashboard", async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 403);
  });

  test("Normal user cannot access Master Admin analytics", async () => {
    const res = await fetch(`${baseUrl}/master-admin/analytics`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 403);
  });

  test("User A cannot delete User B's social post", async () => {
    const postB = await SocialPost.create({
      authorId: userB.id,
      authorName: userB.name,
      caption: "User B Outfit",
      image: "/img.png"
    });

    const res = await fetch(`${baseUrl}/social/${postB.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.strictEqual(res.status, 403);
  });
});

describe("3. PRICE MANIPULATION & TAX REMOVAL TESTS", () => {
  let user, token, product;

  before(async () => {
    user = await User.create({ name: "Pricer", email: `pricer_${Date.now()}@example.com`, password: "Password@123", role: "user" });
    token = signAccessToken(user);
    product = await Product.create({
      name: "Luxury Suit",
      category: "Luxury",
      price: 10000,
      stock: 5,
      available: true
    });
  });

  test("Backend ignores frontend price & discount manipulation and enforces 0% tax", async () => {
    user.cart = [{ productId: product.id, name: product.name, price: 1, quantity: 1 }];
    await user.save();

    const res = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        price: 1,
        discount: 999999,
        total: 1,
        shippingAddress: { line1: "123 St", city: "City", state: "State", postalCode: "560001" }
      })
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    // Subtotal = 10000, Tax = 0, Delivery = 0, Total = 10000
    assert.strictEqual(json.data.subtotal, 10000);
    assert.strictEqual(json.data.tax, 0);
    assert.strictEqual(json.data.total, 10000);
    assert.strictEqual(json.data.paymentMethod, "COD");
  });
});

describe("4. THREE-ROLE RBAC HIERARCHY TESTS", () => {
  let userUser, adminUser, masterUser;
  let tokenUser, tokenAdmin, tokenMaster;

  before(async () => {
    userUser = await User.create({ name: "Regular Renter", email: `renter_${Date.now()}@test.com`, password: "Password@123", role: "user" });
    adminUser = await User.create({ name: "Staff Admin", email: `admin_${Date.now()}@test.com`, password: "Password@123", role: "admin" });
    masterUser = await User.create({ name: "Executive Master", email: `master_${Date.now()}@test.com`, password: "Password@123", role: "master" });

    tokenUser = signAccessToken(userUser);
    tokenAdmin = signAccessToken(adminUser);
    tokenMaster = signAccessToken(masterUser);
  });

  test("Admin CAN access /api/admin/dashboard", async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert.strictEqual(res.status, 200);
  });

  test("Admin CANNOT access /api/master-admin/analytics (403 Forbidden)", async () => {
    const res = await fetch(`${baseUrl}/master-admin/analytics`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert.strictEqual(res.status, 403);
  });

  test("Master Admin CAN access /api/admin/dashboard (role inheritance)", async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${tokenMaster}` }
    });
    assert.strictEqual(res.status, 200);
  });

  test("Master Admin CAN access /api/master-admin/analytics", async () => {
    const res = await fetch(`${baseUrl}/master-admin/analytics`, {
      headers: { Authorization: `Bearer ${tokenMaster}` }
    });
    assert.strictEqual(res.status, 200);
  });
});

describe("5. RENTAL BOOKING, ₹50 ADVANCE & SIZE-AWARE INVENTORY", () => {
  let user, token, product;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const fourDaysLater = new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0];

  before(async () => {
    user = await User.create({ name: "Renter Customer", email: `renter_cust_${Date.now()}@test.com`, password: "Password@123", role: "user" });
    token = signAccessToken(user);

    product = await Product.create({
      name: "Designer Sherwani",
      category: "Ethnic",
      rentPrice: 400, // ₹400 / day
      price: 15000,
      sizeVariants: [
        { size: "S", stock: 1, available: true },
        { size: "M", stock: 2, available: true }
      ],
      sizes: ["S", "M"],
      stock: 3,
      available: true
    });
  });

  test("Reject booking with missing size", async () => {
    const res = await fetch(`${baseUrl}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.id, pickupDate: tomorrow, returnDate: fourDaysLater })
    });
    assert.strictEqual(res.status, 400);
  });

  test("Create rental booking with ₹50 advance included in total (3 days × ₹400 = ₹1200)", async () => {
    const res = await fetch(`${baseUrl}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.id, size: "S", pickupDate: tomorrow, returnDate: fourDaysLater })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);

    const rental = json.data;
    assert.strictEqual(rental.size, "S");
    assert.strictEqual(rental.rentalDuration, 3);
    assert.strictEqual(rental.rentalAmount, 1200); // 3 * 400
    assert.strictEqual(rental.advanceAmount, 50);  // ₹50 advance
    assert.strictEqual(rental.remainingAmount, 1150); // 1200 - 50 = 1150
    assert.strictEqual(rental.advanceStatus, "ADVANCE_PENDING");
    assert.strictEqual(rental.rentalStatus, "PENDING_ADVANCE");
    assert.strictEqual(rental.paymentMethod, "CASH");
  });

  test("Prevent overlapping rental for size S when stock is 1", async () => {
    const res = await fetch(`${baseUrl}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.id, size: "S", pickupDate: tomorrow, returnDate: fourDaysLater })
    });
    assert.strictEqual(res.status, 400);
  });

  test("Size M is still available when size S is booked", async () => {
    const res = await fetch(`${baseUrl}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.id, size: "M", pickupDate: tomorrow, returnDate: fourDaysLater })
    });
    assert.strictEqual(res.status, 200);
  });
});

describe("6. HISTORICAL PRICE PRESERVATION", () => {
  let user, token, product, rentalId;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextDay = new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];

  before(async () => {
    user = await User.create({ name: "Price Renter", email: `price_renter_${Date.now()}@test.com`, password: "Password@123" });
    token = signAccessToken(user);

    product = await Product.create({
      name: "Tuxedo Suit",
      category: "Suits",
      rentPrice: 500,
      sizeVariants: [{ size: "M", stock: 5, available: true }],
      sizes: ["M"],
      stock: 5,
      available: true
    });

    const res = await fetch(`${baseUrl}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.id, size: "M", pickupDate: tomorrow, returnDate: nextDay })
    });
    const json = await res.json();
    rentalId = json.data.id;
  });

  test("When Admin later changes product rental price, historical rental retains original price", async () => {
    // Admin changes price from ₹500 to ₹800
    await Product.findByIdAndUpdate(product.id, { rentPrice: 800 });

    const fetchRes = await fetch(`${baseUrl}/rentals/${rentalId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await fetchRes.json();
    assert.strictEqual(json.data.rentalAmount, 500); // Retains ₹500!
    assert.strictEqual(json.data.priceSnapshot.dailyRate, 500);
  });
});

describe("7. RENTAL LIFECYCLE & EXTENSION WORKFLOW", () => {
  let customer, admin, tokenCustomer, tokenAdmin, rentalId;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const threeDaysLater = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];
  const fiveDaysLater = new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0];

  before(async () => {
    customer = await User.create({ name: "Lifecycle Customer", email: `lifecycle_${Date.now()}@test.com`, password: "Password@123", role: "user" });
    admin = await User.create({ name: "Admin Inspector", email: `inspector_${Date.now()}@test.com`, password: "Password@123", role: "admin" });
    tokenCustomer = signAccessToken(customer);
    tokenAdmin = signAccessToken(admin);

    const product = await Product.create({
      name: "Gala Gown",
      category: "Dresses",
      rentPrice: 300,
      sizeVariants: [{ size: "L", stock: 3, available: true }],
      sizes: ["L"],
      stock: 3,
      available: true
    });

    const res = await fetch(`${baseUrl}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenCustomer}` },
      body: JSON.stringify({ productId: product.id, size: "L", pickupDate: tomorrow, returnDate: threeDaysLater })
    });
    const json = await res.json();
    rentalId = json.data.id;
  });

  test("Admin confirms ₹50 advance received", async () => {
    const res = await fetch(`${baseUrl}/admin/rentals/${rentalId}/advance`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.advanceStatus, "ADVANCE_RECEIVED");
    assert.strictEqual(json.data.rentalStatus, "CONFIRMED");
  });

  test("Admin performs handover inspection and customer acknowledges baseline evidence", async () => {
    // Admin records inspection with pre-existing stain note
    const inspRes = await fetch(`${baseUrl}/admin/rentals/${rentalId}/handover-inspection`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ condition: "Good", stains: true, notes: "Faint stain on inside lining", photos: ["http://photo.com/1.jpg"] })
    });
    assert.strictEqual(inspRes.status, 200);

    // Customer acknowledges
    const ackRes = await fetch(`${baseUrl}/rentals/${rentalId}/acknowledge-handover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenCustomer}` }
    });
    const ackJson = await ackRes.json();
    assert.strictEqual(ackRes.status, 200);
    assert.strictEqual(ackJson.data.handoverInspection.customerAcknowledged, true);
  });

  test("Admin records remaining payment, rental becomes ACTIVE", async () => {
    const res = await fetch(`${baseUrl}/admin/rentals/${rentalId}/remaining-payment`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.remainingPaymentStatus, "REMAINING_RECEIVED");
    assert.strictEqual(json.data.rentalStatus, "ACTIVE_RENTAL");
  });

  test("Customer extends rental by 2 days without re-charging ₹50 advance", async () => {
    const extRes = await fetch(`${baseUrl}/rentals/${rentalId}/request-extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenCustomer}` },
      body: JSON.stringify({ requestedEndDate: fiveDaysLater })
    });
    assert.strictEqual(extRes.status, 200);

    // Admin approves
    const appRes = await fetch(`${baseUrl}/admin/rentals/${rentalId}/extension`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ decision: "APPROVED" })
    });
    const json = await appRes.json();
    assert.strictEqual(appRes.status, 200);
    assert.strictEqual(json.data.rentalStatus, "EXTENDED");
    assert.strictEqual(json.data.advanceAmount, 50); // Advance remains ₹50!
    assert.strictEqual(json.data.extensionAmount, 600); // 2 additional days * 300
  });

  test("Return inspection detects pre-existing stain, does NOT treat as new damage", async () => {
    const returnRes = await fetch(`${baseUrl}/admin/rentals/${rentalId}/return-inspection`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ condition: "Good", stains: true, notes: "Same pre-existing stain present" })
    });
    const json = await returnRes.json();
    assert.strictEqual(returnRes.status, 200);
    // Because stain was recorded at handover, rental completed cleanly without damage status
    assert.strictEqual(json.data.rentalStatus, "COMPLETED");
  });
});

describe("8. MASTER ADMIN GOVERNANCE & ADMIN LIFECYCLE", () => {
  let master, tokenMaster;
  let createdAdminId;

  before(async () => {
    master = await User.create({ name: "Master Gov", email: `master_gov_${Date.now()}@test.com`, password: "Password@123", role: "master" });
    tokenMaster = signAccessToken(master);
  });

  test("Master Admin creates new Admin account", async () => {
    const adminEmail = `new_admin_${Date.now()}@test.com`;
    const res = await fetch(`${baseUrl}/master-admin/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenMaster}` },
      body: JSON.stringify({ name: "Branch Admin", email: adminEmail, password: "SecureAdmin@123" })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.role, "admin");
    assert.strictEqual(json.data.status, "active");
    createdAdminId = json.data.id;
  });

  test("Master Admin disables Admin account and disabled admin is rejected", async () => {
    const disableRes = await fetch(`${baseUrl}/master-admin/admins/${createdAdminId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenMaster}` },
      body: JSON.stringify({ status: "disabled" })
    });
    assert.strictEqual(disableRes.status, 200);

    // Verify disabled user cannot access admin APIs
    const disabledUser = await User.findById(createdAdminId);
    const disabledToken = signAccessToken(disabledUser);

    const checkRes = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${disabledToken}` }
    });
    assert.strictEqual(checkRes.status, 403);
  });
});

describe("9. PRODUCTION HARDENING, ROLE ESCALATION & DAMAGE ISOLATION", () => {
  let testUser, userToken, testAdmin, adminToken;

  before(async () => {
    testUser = await User.create({
      name: "Harden User",
      email: `harden_user_${Date.now()}@test.com`,
      password: "Password@123",
      role: "user"
    });
    userToken = signAccessToken(testUser);

    testAdmin = await User.create({
      name: "Harden Admin",
      email: `harden_admin_${Date.now()}@test.com`,
      password: "Password@123",
      role: "admin"
    });
    adminToken = signAccessToken(testAdmin);
  });

  test("Signup ignores role escalation attempt (payload role: 'admin' yields 'user')", async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Escalator",
        email: `escalate_${Date.now()}@test.com`,
        password: "Password@123",
        role: "admin"
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.user.role, "user");
  });

  test("Profile update ignores role escalation and status manipulation", async () => {
    const res = await fetch(`${baseUrl}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ role: "master", status: "disabled", name: "Updated Name" })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.role, "user");
    assert.strictEqual(json.data.name, "Updated Name");

    const reloaded = await User.findById(testUser.id);
    assert.strictEqual(reloaded.role, "user");
    assert.strictEqual(reloaded.status, "active");
  });

  test("Admin cannot create another Admin or access Master Admin routes (403)", async () => {
    const res = await fetch(`${baseUrl}/master-admin/admins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: "Rogue Admin",
        email: `rogue_${Date.now()}@test.com`,
        password: "Password@123"
      })
    });
    assert.strictEqual(res.status, 403);
  });

  test("Damage charges remain strictly isolated from base rental price (Rental=₹500, Damage=₹800)", async () => {
    const product = await Product.create({
      name: "Tuxedo Damage Test",
      category: "Suits",
      price: 5000,
      rentPrice: 500,
      stock: 5,
      available: true,
      sizeVariants: [{ size: "L", stock: 5, available: true }]
    });

    const rental = await Rental.create({
      userId: testUser.id,
      clothId: product.id,
      productId: product.id,
      size: "L",
      rentalStartDate: "2026-10-01",
      originalEndDate: "2026-10-02",
      currentEndDate: "2026-10-02",
      rentalDuration: 1,
      rentalAmount: 500,
      originalRentalAmount: 500,
      advanceAmount: 50,
      remainingAmount: 450,
      rentalStatus: "ACTIVE_RENTAL"
    });

    const res = await fetch(`${baseUrl}/admin/rentals/${rental.id}/damage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        description: "Red wine spill across lapel",
        severity: "severe",
        amount: 800
      })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);

    // Rental amount MUST remain ₹500, NOT ₹1300
    assert.strictEqual(json.data.rentalAmount, 500);
    assert.strictEqual(json.data.remainingAmount, 450);
    assert.strictEqual(json.data.damageReport.amount, 800);
    assert.strictEqual(json.data.rentalStatus, "DAMAGE_REPORTED");
  });

  test("Reject malicious or non-image file upload", async () => {
    const boundary = "----WebKitFormBoundaryTest";
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="image"; filename="exploit.exe"',
      'Content-Type: application/x-msdownload',
      '',
      'MZ90fakeexecutablecontent',
      `--${boundary}--`
    ].join("\r\n");

    const res = await fetch(`${baseUrl}/upload/image`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${adminToken}`
      },
      body
    });
    // multer fileFilter throws error or returns 400
    assert.ok(res.status >= 400);
  });
});



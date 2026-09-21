import assert from "node:assert";
import test, { before, after, describe } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Rental } from "../models/Rental.js";
import { SocialPost } from "../models/SocialPost.js";
import { Coupon } from "../models/Coupon.js";
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
      body: JSON.stringify({ name: "Test User", email: testEmail, password: "User@123" })
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.user.email, testEmail);
  });

  test("Reject duplicate email signup", async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dup User", email: testEmail, password: "User@123" })
    });
    assert.strictEqual(res.status, 409);
  });

  test("Login with valid credentials", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "User@123" })
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

describe("3. PRICE MANIPULATION ATTACK TESTS", () => {
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

  test("Backend ignores frontend price & discount manipulation", async () => {
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
    // Subtotal = 10000, Tax = 800, Delivery = 0 (subtotal > 1499), Total = 10800
    assert.strictEqual(json.data.subtotal, 10000);
    assert.strictEqual(json.data.total, 10800);
  });
});

describe("4. STOCK CONCURRENCY TESTS", () => {
  let user1, user2, token1, token2, rareProduct;

  before(async () => {
    user1 = await User.create({ name: "Racer 1", email: `racer1_${Date.now()}@example.com`, password: "Password@123" });
    user2 = await User.create({ name: "Racer 2", email: `racer2_${Date.now()}@example.com`, password: "Password@123" });
    token1 = signAccessToken(user1);
    token2 = signAccessToken(user2);

    rareProduct = await Product.create({
      name: "Rare Edition Jacket",
      category: "Streetwear",
      price: 5000,
      stock: 1,
      available: true
    });

    user1.cart = [{ productId: rareProduct.id, name: rareProduct.name, price: 5000, quantity: 1 }];
    user2.cart = [{ productId: rareProduct.id, name: rareProduct.name, price: 5000, quantity: 1 }];
    await user1.save();
    await user2.save();
  });

  test("Atomic stock decrement prevents double spending when stock = 1", async () => {
    const address = { line1: "Campus St", city: "Blr", state: "KA", postalCode: "560001" };

    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
        body: JSON.stringify({ shippingAddress: address })
      }),
      fetch(`${baseUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token2}` },
        body: JSON.stringify({ shippingAddress: address })
      })
    ]);

    const status1 = res1.status;
    const status2 = res2.status;

    const statuses = [status1, status2].sort();
    assert.deepStrictEqual(statuses, [200, 400]);

    const updated = await Product.findById(rareProduct.id);
    assert.strictEqual(updated.stock, 0);
  });
});

describe("5. RENTAL MULTI-UNIT AVAILABILITY TESTS", () => {
  let user, token, rentalProduct;

  before(async () => {
    user = await User.create({ name: "Renter", email: `renter_${Date.now()}@example.com`, password: "Password@123" });
    token = signAccessToken(user);
    rentalProduct = await Product.create({
      name: "Designer Lehenga",
      category: "Ethnic",
      price: 15000,
      rentPrice: 500,
      securityDeposit: 1000,
      stock: 1,
      available: true
    });
  });

  test("Prevent overlapping rental when stock is fully booked", async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0];

    const res1 = await fetch(`${baseUrl}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: rentalProduct.id, pickupDate: tomorrow, returnDate: nextWeek })
    });
    assert.strictEqual(res1.status, 200);

    const res2 = await fetch(`${baseUrl}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: rentalProduct.id, pickupDate: tomorrow, returnDate: nextWeek })
    });
    assert.strictEqual(res2.status, 400);
  });
});

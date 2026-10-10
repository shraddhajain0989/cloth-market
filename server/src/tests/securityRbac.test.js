import assert from "node:assert";
import test, { before, after, describe } from "node:test";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { Payment } from "../models/Payment.js";
import { signAccessToken } from "../utils/tokens.js";
import { env } from "../config/env.js";

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

describe("SECURITY & RBAC AUTHORIZATION AUDIT TEST SUITE", () => {
  let normalUser, adminUser, masterUser, disabledUser;
  let normalToken, adminToken, masterToken, disabledToken;

  before(async () => {
    const passwordHash = await bcrypt.hash("Password@123", 10);
    normalUser = await User.create({
      name: "Normal Customer",
      email: `customer_${Date.now()}@test.com`,
      password: passwordHash,
      role: "user",
      status: "active"
    });

    adminUser = await User.create({
      name: "Staff Admin",
      email: `admin_${Date.now()}@test.com`,
      password: passwordHash,
      role: "admin",
      status: "active"
    });

    masterUser = await User.create({
      name: "Master Commander",
      email: `master_${Date.now()}@test.com`,
      password: passwordHash,
      role: "master",
      status: "active"
    });

    disabledUser = await User.create({
      name: "Disabled User",
      email: `disabled_${Date.now()}@test.com`,
      password: passwordHash,
      role: "admin",
      status: "disabled"
    });

    normalToken = signAccessToken(normalUser);
    adminToken = signAccessToken(adminUser);
    masterToken = signAccessToken(masterUser);
    disabledToken = signAccessToken(disabledUser);
  });

  describe("1. Unauthenticated Visitor Access Control (401 Unauthorized)", () => {
    test("GET /api/admin/dashboard without token is rejected with 401", async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test("DELETE /api/admin/products/bulk without token is rejected with 401", async () => {
      const res = await fetch(`${baseUrl}/admin/products/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ["64f000000000000000000001"] })
      });
      assert.strictEqual(res.status, 401);
    });

    test("POST /api/upload/image without token is rejected with 401", async () => {
      const res = await fetch(`${baseUrl}/upload/image`, {
        method: "POST"
      });
      assert.strictEqual(res.status, 401);
    });

    test("GET /api/master-admin/analytics without token is rejected with 401", async () => {
      const res = await fetch(`${baseUrl}/master-admin/analytics`);
      assert.strictEqual(res.status, 401);
    });
  });

  describe("2. Customer Role Boundary Enforcement (403 Forbidden)", () => {
    test("Normal user calling GET /api/admin/dashboard is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${normalToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /permission|forbidden/i);
    });

    test("Normal user calling DELETE /api/admin/products/bulk is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/admin/products/bulk`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${normalToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ productIds: ["64f000000000000000000001"] })
      });
      assert.strictEqual(res.status, 403);
    });

    test("Normal user calling POST /api/admin/rentals/:id/advance is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/admin/rentals/64f000000000000000000001/advance`, {
        method: "POST",
        headers: { Authorization: `Bearer ${normalToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    test("Normal user calling POST /api/payments/:id/verify is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/payments/64f000000000000000000001/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${normalToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    test("Normal user calling POST /api/upload/image is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${normalToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    test("Normal user calling POST /api/upload/images is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/upload/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${normalToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    test("Normal user calling GET /api/config/admin is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/config/admin`, {
        headers: { Authorization: `Bearer ${normalToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    test("Normal user calling POST /api/products is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${normalToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Malicious Injection Dress",
          category: "Evening Wear",
          sizes: ["M"],
          rentalPricePerDay: 400
        })
      });
      assert.strictEqual(res.status, 403);
    });
  });

  describe("3. Role Escalation Payload Prevention", () => {
    test("Signup ignores role manipulation payload and sets role='user'", async () => {
      const evilEmail = `evil_signup_${Date.now()}@test.com`;
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Hacker",
          email: evilEmail,
          password: "Password@123",
          role: "master" // Privilege escalation attempt
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.user.role, "user");

      // Verify in database directly
      const saved = await User.findOne({ email: evilEmail });
      assert.strictEqual(saved.role, "user");
    });

    test("Profile update ignores role tampering attempt", async () => {
      const res = await fetch(`${baseUrl}/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${normalToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Renamed Customer",
          role: "admin", // Escalation attempt
          status: "disabled"
        })
      });
      assert.strictEqual(res.status, 200);

      // Verify DB role remains "user"
      const userInDb = await User.findById(normalUser._id);
      assert.strictEqual(userInDb.role, "user");
    });
  });

  describe("4. JWT Integrity and Expiration Verification", () => {
    test("A forged JWT with a modified role (tampered payload reassembled with original signature) is rejected with 401", async () => {
      // Split authentic customer token
      const [header, , sig] = normalToken.split(".");
      // Tamper payload to claim admin role
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: normalUser._id.toString(), role: "admin", email: normalUser.email })
      ).toString("base64url");
      const forgedToken = `${header}.${tamperedPayload}.${sig}`;

      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${forgedToken}` }
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test("A token signed using an incorrect secret is rejected with 401", async () => {
      // Craft a token signed with an invalid attacker secret
      const wrongSecretToken = jwt.sign(
        { sub: normalUser._id.toString(), role: "admin" },
        "attacker-secret-key-that-does-not-match"
      );

      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${wrongSecretToken}` }
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test("Expired JWT is rejected with 401", async () => {
      const expiredToken = jwt.sign(
        { sub: adminUser._id.toString(), role: "admin", exp: Math.floor(Date.now() / 1000) - 3600 },
        env.jwtSecret
      );

      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /expired/i);
    });
  });

  describe("5. Master Admin Privilege Isolation & Authorized Access", () => {
    test("Ordinary Admin calling GET /api/master-admin/admins is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/master-admin/admins`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    test("Ordinary Admin calling GET /api/master-admin/analytics is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/master-admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    test("Ordinary Admin calling POST /api/master-admin/admins is blocked with 403", async () => {
      const res = await fetch(`${baseUrl}/master-admin/admins`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Sub Admin",
          email: "subadmin@test.com",
          password: "Password@123"
        })
      });
      assert.strictEqual(res.status, 403);
    });

    test("Authorized Staff Admin retains legitimate access to /api/admin/dashboard", async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test("Authorized Master Admin retains legitimate access to /api/master-admin/analytics", async () => {
      const res = await fetch(`${baseUrl}/master-admin/analytics`, {
        headers: { Authorization: `Bearer ${masterToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.kpis);
    });

    test("Authorized Master Admin inherits access to regular admin endpoints (/api/admin/dashboard)", async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${masterToken}` }
      });
      assert.strictEqual(res.status, 200);
    });
  });

  describe("6. Disabled Account Lockout", () => {
    test("Disabled user calling protected endpoint is rejected with 403", async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${disabledToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /disabled/i);
    });

    test("Disabled user attempting login is rejected with 403", async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: disabledUser.email,
          password: "Password@123"
        })
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /disabled/i);
    });
  });

  describe("7. Public Endpoint Data Leak Prevention", () => {
    test("GET /api/config/public exposes NO internal admin metadata or secrets", async () => {
      const res = await fetch(`${baseUrl}/config/public`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);

      const cfg = body.data;
      // Assert only customer-relevant public fields exist
      assert.strictEqual(typeof cfg.businessName, "string");
      assert.strictEqual(typeof cfg.whatsappNumber, "string");
      assert.strictEqual(typeof cfg.paymentQrUrl, "string");
      assert.strictEqual(typeof cfg.upiId, "string");
      assert.strictEqual(typeof cfg.paymentInstructions, "string");

      // Verify sensitive server keys are NOT leaked
      assert.strictEqual(cfg.jwtSecret, undefined);
      assert.strictEqual(cfg.jwtRefreshSecret, undefined);
      assert.strictEqual(cfg.mongoUri, undefined);
      assert.strictEqual(cfg.password, undefined);
      assert.strictEqual(cfg._id, undefined);
      assert.strictEqual(cfg.__v, undefined);
    });
  });
});

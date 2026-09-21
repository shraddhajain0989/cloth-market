/**
 * DB Seed Script
 * Run once to populate MongoDB with initial data.
 * Usage: node src/data/dbSeed.js
 * Safe to re-run — uses upsert so it won't create duplicates.
 */

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Coupon } from "../models/Coupon.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log("✅ MongoDB connected for seeding.");

  // ── Users ─────────────────────────────────────────────────
  const usersData = [
    {
      name: "Admin User",
      email: "admin@example.com",
      password: "Admin@123",
      role: "admin",
      verified: true
    },
    {
      name: "Master User",
      email: "master@example.com",
      password: "Master@123",
      role: "master",
      verified: true
    },
    {
      name: "Demo Shopper",
      email: "user@example.com",
      password: "User@123",
      role: "user",
      verified: true,
      loyaltyPoints: 120,
      walletBalance: 450,
      preferences: { gender: "women", style: ["streetwear", "minimal"], budget: 2000 }
    }
  ];

  for (const userData of usersData) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    await User.findOneAndUpdate(
      { email: userData.email },
      { ...userData, password: passwordHash },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`👤 User seeded: ${userData.email}`);
  }

  // ── Products ───────────────────────────────────────────────
  const productsData = [
    {
      name: "Denim Jacket",
      category: "Jackets",
      tags: ["trending", "casual"],
      sku: "CM-JKT-001",
      barcode: "890000000001",
      price: 1999,
      rentPrice: 299,
      securityDeposit: 900,
      flashSalePrice: 1699,
      stock: 12,
      sizes: ["S", "M", "L"],
      rating: 4.7,
      reviewsCount: 32,
      badge: "Trending",
      description: "Classic denim jacket with a relaxed modern silhouette.",
      images: ["/images/jacket1.jpg"],
      available: true
    },
    {
      name: "Simple Kurti",
      category: "Ethnic",
      tags: ["best seller", "festive"],
      sku: "CM-KRT-002",
      barcode: "890000000002",
      price: 1399,
      rentPrice: 129,
      securityDeposit: 500,
      stock: 18,
      sizes: ["M", "L", "XL"],
      rating: 4.5,
      reviewsCount: 21,
      badge: "Best Seller",
      description: "Lightweight kurti designed for daily and festive wear.",
      images: ["/images/kurti1.png"],
      available: true
    },
    {
      name: "White Modern Top",
      category: "Tops",
      tags: ["minimal", "editor"],
      sku: "CM-TOP-003",
      barcode: "890000000003",
      price: 899,
      rentPrice: 109,
      securityDeposit: 350,
      stock: 7,
      sizes: ["XS", "S", "M"],
      rating: 4.2,
      reviewsCount: 14,
      badge: "Editor Pick",
      description: "A clean modern top with a sharp silhouette.",
      images: ["/images/white_top1.png"],
      available: true
    }
  ];

  for (const productData of productsData) {
    await Product.findOneAndUpdate(
      { sku: productData.sku },
      productData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`👗 Product seeded: ${productData.name}`);
  }

  // ── Coupons ────────────────────────────────────────────────
  const couponsData = [
    { code: "WELCOME10", type: "percent", value: 10, minOrderValue: 999, active: true },
    { code: "FLAT100", type: "fixed", value: 100, minOrderValue: 1499, active: true }
  ];

  for (const couponData of couponsData) {
    await Coupon.findOneAndUpdate(
      { code: couponData.code },
      couponData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`🎟️  Coupon seeded: ${couponData.code}`);
  }

  console.log("\n🎉 Seeding complete!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

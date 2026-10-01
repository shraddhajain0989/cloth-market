/**
 * DB Seed Script for Cloth Rental Platform
 * Populates MongoDB with catalog clothes, size variants, and coupons.
 * Usage: node src/data/dbSeed.js
 */

import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Coupon } from "../models/Coupon.js";
import { Product } from "../models/Product.js";

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log("✅ MongoDB connected for seeding catalog.");

  // ── Products for Cloth Rental Platform ────────────────────
  const productsData = [
    {
      name: "Royal Navy Bandhgala Suit",
      category: "Suits",
      gender: "Men",
      tags: ["wedding", "formal", "designer"],
      sku: "CR-SUIT-001",
      barcode: "890000000001",
      price: 18000,
      rentPrice: 650,
      securityDeposit: 2000,
      sizes: ["S", "M", "L", "XL"],
      sizeVariants: [
        { size: "S", stock: 2, available: true },
        { size: "M", stock: 5, available: true },
        { size: "L", stock: 4, available: true },
        { size: "XL", stock: 1, available: true }
      ],
      rating: 4.9,
      reviewsCount: 38,
      badge: "Popular",
      description: "Handcrafted bespoke navy bandhgala tailored in premium Italian wool-silk blend. Perfect for receptions and luxury gala evenings.",
      images: [
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?q=80&w=800&auto=format&fit=crop"
      ],
      available: true
    },
    {
      name: "Crimson Silk Embroidered Lehenga",
      category: "Bridal",
      gender: "Women",
      tags: ["bridal", "festive", "zari"],
      sku: "CR-LEH-002",
      barcode: "890000000002",
      price: 35000,
      rentPrice: 1200,
      securityDeposit: 4000,
      sizes: ["XS", "S", "M", "L"],
      sizeVariants: [
        { size: "XS", stock: 1, available: true },
        { size: "S", stock: 3, available: true },
        { size: "M", stock: 4, available: true },
        { size: "L", stock: 2, available: true }
      ],
      rating: 4.8,
      reviewsCount: 52,
      badge: "Bridal Special",
      description: "Intricately hand-embroidered raw silk lehenga with antique gold zardozi motifs and lightweight net dupatta.",
      images: [
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop"
      ],
      available: true
    },
    {
      name: "Emerald Green Chanderi Anarkali",
      category: "Ethnic",
      gender: "Women",
      tags: ["festive", "sangeet", "traditional"],
      sku: "CR-ANK-003",
      barcode: "890000000003",
      price: 8500,
      rentPrice: 380,
      securityDeposit: 1000,
      sizes: ["S", "M", "L", "XL", "XXL"],
      sizeVariants: [
        { size: "S", stock: 3, available: true },
        { size: "M", stock: 6, available: true },
        { size: "L", stock: 5, available: true },
        { size: "XL", stock: 2, available: true },
        { size: "XXL", stock: 1, available: true }
      ],
      rating: 4.7,
      reviewsCount: 29,
      badge: "Trending",
      description: "Graceful Chanderi silk Anarkali kurta featuring gold gota patti border, paired with churidar and organza dupatta.",
      images: [
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop"
      ],
      available: true
    },
    {
      name: "Midnight Black Tuxedo",
      category: "Suits",
      gender: "Men",
      tags: ["black-tie", "cocktail", "luxury"],
      sku: "CR-TUX-004",
      barcode: "890000000004",
      price: 22000,
      rentPrice: 750,
      securityDeposit: 2500,
      sizes: ["S", "M", "L", "XL"],
      sizeVariants: [
        { size: "S", stock: 2, available: true },
        { size: "M", stock: 4, available: true },
        { size: "L", stock: 3, available: true },
        { size: "XL", stock: 1, available: true }
      ],
      rating: 4.9,
      reviewsCount: 44,
      badge: "Bestseller",
      description: "Single-breasted satin shawl collar tuxedo crafted with satin piping and tailored slim trousers.",
      images: [
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop"
      ],
      available: true
    }
  ];

  for (const productData of productsData) {
    await Product.findOneAndUpdate(
      { sku: productData.sku },
      productData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`👗 Cloth seeded: ${productData.name} (Rent: ₹${productData.rentPrice}/day)`);
  }

  // ── Coupons ────────────────────────────────────────────────
  const couponsData = [
    { code: "RENT50", type: "fixed", value: 50, minOrderValue: 500, active: true },
    { code: "FESTIVE15", type: "percent", value: 15, minOrderValue: 1000, active: true }
  ];

  for (const couponData of couponsData) {
    await Coupon.findOneAndUpdate(
      { code: couponData.code },
      couponData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`🎟️  Coupon seeded: ${couponData.code}`);
  }

  console.log("\n🎉 Catalog seeding complete!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

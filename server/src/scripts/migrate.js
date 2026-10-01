import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop";

/**
 * Safe, Idempotent Database Migration Script for Cloth Rental Platform
 * 
 * - Preserves existing products, users, rentals, prices, and IDs
 * - Zero destructive operations (no deleteMany, drop, or remove)
 * - Safe legacy field mapping for Rentals (productId -> clothId)
 * - Resolves missing fields with safe defaults without fabricating false data
 * - Fully idempotent (safe to run multiple times without duplicated or altered data)
 */
export async function runMigration(options = {}) {
  console.log("==================================================");
  console.log("🔄 Starting Database Migration for Cloth Rental Platform");
  console.log("==================================================");

  const mongoUri = options.mongoUri || process.env.MIGRATION_MONGO_URI || env.mongoUri;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not configured in environment or options.");
    return { success: false, error: "Missing MONGODB_URI" };
  }

  const shouldClose = options.autoClose !== false;

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected for migration.");
  }

  const stats = {
    products: { inspected: 0, updated: 0, unchanged: 0 },
    users: { inspected: 0, updated: 0, unchanged: 0 },
    rentals: {
      inspected: 0,
      migrated: 0,
      alreadyMigrated: 0,
      specialHandling: 0,
      unresolved: 0,
      issues: []
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. MIGRATE PRODUCTS
  // ─────────────────────────────────────────────────────────────
  const products = await Product.find();
  stats.products.inspected = products.length;
  console.log(`\n📦 [PRODUCTS] Inspecting ${products.length} product records...`);

  for (const product of products) {
    let modified = false;

    // Ensure images array exists
    if (!product.images || product.images.length === 0) {
      product.images = [DEFAULT_IMAGE];
      modified = true;
    }

    // Ensure gender exists
    if (!product.gender) {
      product.gender = product.category === "Suits" ? "Men" : "Women";
      modified = true;
    }

    // Ensure rental daily price exists without overwriting existing rentPrice
    if (!product.rentPrice || product.rentPrice <= 0) {
      product.rentPrice = Math.max(300, Math.round((product.price || 2000) * 0.15));
      modified = true;
    }

    // Ensure sizeVariants exist
    if (!product.sizeVariants || product.sizeVariants.length === 0) {
      const baseSizes = product.sizes && product.sizes.length > 0 ? product.sizes : ["S", "M", "L", "XL"];
      const totalStock = product.stock || 12;
      const perSize = Math.max(1, Math.floor(totalStock / baseSizes.length));

      product.sizeVariants = baseSizes.map((s) => ({
        size: s,
        stock: perSize,
        available: true
      }));
      product.sizes = baseSizes;
      product.stock = product.sizeVariants.reduce((sum, v) => sum + v.stock, 0);
      modified = true;
    }

    if (modified) {
      await product.save();
      stats.products.updated++;
    } else {
      stats.products.unchanged++;
    }
  }
  console.log(`✅ Products: ${stats.products.updated} updated, ${stats.products.unchanged} unchanged (total: ${stats.products.inspected}).`);

  // ─────────────────────────────────────────────────────────────
  // 2. MIGRATE USERS
  // ─────────────────────────────────────────────────────────────
  const users = await User.find();
  stats.users.inspected = users.length;
  console.log(`\n👤 [USERS] Inspecting ${users.length} user records...`);

  for (const user of users) {
    let modified = false;
    if (!user.status) {
      user.status = "active";
      modified = true;
    }
    if (!user.role) {
      user.role = "user";
      modified = true;
    }
    if (modified) {
      await user.save();
      stats.users.updated++;
    } else {
      stats.users.unchanged++;
    }
  }
  console.log(`✅ Users: ${stats.users.updated} updated, ${stats.users.unchanged} unchanged (total: ${stats.users.inspected}).`);

  // ─────────────────────────────────────────────────────────────
  // 3. MIGRATE RENTALS
  // ─────────────────────────────────────────────────────────────
  const rentals = await Rental.find();
  stats.rentals.inspected = rentals.length;
  console.log(`\n👗 [RENTALS] Inspecting ${rentals.length} rental records...`);

  for (const rental of rentals) {
    let modified = false;

    // A. Detect legacy cloth / product reference across all possible historical field names
    const rawClothId =
      rental.clothId ||
      rental.productId ||
      rental._doc?.clothId ||
      rental._doc?.productId ||
      rental._doc?.product ||
      rental._doc?.cloth ||
      rental._doc?.itemId ||
      rental.clothSnapshot?.id;

    const clothId = rawClothId ? String(rawClothId).trim() : null;

    if (!clothId) {
      const issue = {
        rentalId: String(rental._id),
        userId: rental.userId,
        reason: "No product or cloth identifier found across any legacy field (clothId, productId, item). Skipped to prevent data corruption."
      };
      stats.rentals.issues.push(issue);
      stats.rentals.unresolved++;
      console.warn(`⚠️  [UNRESOLVED] Rental ${rental._id}: ${issue.reason}`);
      continue;
    }

    // Set clothId and productId to ensure mutual consistency
    if (rental.clothId !== clothId) {
      rental.clothId = clothId;
      modified = true;
    }
    if (rental.productId !== clothId) {
      rental.productId = clothId;
      modified = true;
    }

    // B. Verify referenced Product in catalog
    let referencedProduct = null;
    try {
      referencedProduct = await Product.findById(clothId);
    } catch {
      // In case clothId is not a valid ObjectId string
    }

    if (!referencedProduct) {
      stats.rentals.specialHandling++;
      const issue = {
        rentalId: String(rental._id),
        clothId,
        reason: `Referenced Product '${clothId}' no longer exists in Product catalog. Preserving historical reference without creating false product.`
      };
      stats.rentals.issues.push(issue);
      console.log(`ℹ️  [SPECIAL HANDLING] Rental ${rental._id}: ${issue.reason}`);

      // Provide safe snapshot metadata if completely missing
      if (!rental.clothSnapshot || !rental.clothSnapshot.name) {
        rental.clothSnapshot = {
          name: rental.productName || "Archived Cloth Item",
          category: "Archived",
          image: DEFAULT_IMAGE,
          rentPrice: rental.priceSnapshot?.dailyRate || 0
        };
        modified = true;
      }
    } else {
      // Populate snapshot if missing
      if (!rental.clothSnapshot || !rental.clothSnapshot.name) {
        rental.clothSnapshot = {
          name: referencedProduct.name,
          category: referencedProduct.category || "General",
          image: referencedProduct.images?.[0] || DEFAULT_IMAGE,
          rentPrice: referencedProduct.rentPrice || 0
        };
        modified = true;
      }
      if (!rental.productName) {
        rental.productName = referencedProduct.name;
        modified = true;
      }
    }

    // C. Preserve historical rental pricing (DO NOT overwrite with current product rentPrice)
    if (rental.rentalAmount === undefined || rental.rentalAmount === null) {
      if (rental.total !== undefined && rental.total !== null) {
        rental.rentalAmount = rental.total;
      } else if (rental._doc?.total !== undefined) {
        rental.rentalAmount = rental._doc.total;
      } else if (rental._doc?.rentalAmount !== undefined) {
        rental.rentalAmount = rental._doc.rentalAmount;
      } else {
        rental.rentalAmount = 0;
      }
      modified = true;
    }

    if (rental.originalRentalAmount === undefined || rental.originalRentalAmount === null) {
      rental.originalRentalAmount = rental.rentalAmount;
      modified = true;
    }

    const durationDays = rental.rentalDuration || rental.durationDays || rental._doc?.durationDays || 1;
    if (!rental.rentalDuration) {
      rental.rentalDuration = durationDays;
      modified = true;
    }

    if (!rental.priceSnapshot || !rental.priceSnapshot.totalRental) {
      const dailyRate = durationDays > 0 ? Math.round(rental.rentalAmount / durationDays) : rental.rentalAmount;
      rental.priceSnapshot = {
        dailyRate,
        durationDays,
        totalRental: rental.rentalAmount
      };
      modified = true;
    }

    // D. Advance amount (₹50) and remaining amount
    if (rental.advanceAmount === undefined || rental.advanceAmount === null) {
      rental.advanceAmount = Math.min(50, rental.rentalAmount);
      modified = true;
    }

    if (rental.remainingAmount === undefined || rental.remainingAmount === null) {
      rental.remainingAmount = Math.max(0, rental.rentalAmount - rental.advanceAmount);
      modified = true;
    }

    // E. Preserve historical rental dates
    if (!rental.rentalStartDate) {
      rental.rentalStartDate =
        rental.pickupDate ||
        rental._doc?.pickupDate ||
        (rental.createdAt ? new Date(rental.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
      modified = true;
    }

    if (!rental.currentEndDate) {
      rental.currentEndDate =
        rental.returnDate ||
        rental._doc?.returnDate ||
        (rental.createdAt
          ? new Date(new Date(rental.createdAt).getTime() + 86400000).toISOString().split("T")[0]
          : new Date(Date.now() + 86400000).toISOString().split("T")[0]);
      modified = true;
    }

    if (!rental.originalEndDate) {
      rental.originalEndDate = rental.currentEndDate;
      modified = true;
    }

    // F. Preserve historical size
    if (!rental.size) {
      rental.size = rental._doc?.size || "M";
      modified = true;
    }

    // G. Lifecycle & payment status mapping
    const legacyStatus = rental.status || rental._doc?.status || "";

    if (["Booked", "Active", "Completed"].includes(legacyStatus) && rental.advanceStatus === "ADVANCE_PENDING") {
      rental.advanceStatus = "ADVANCE_RECEIVED";
      modified = true;
    }

    if (["Active", "Completed"].includes(legacyStatus) && rental.remainingPaymentStatus === "REMAINING_PENDING") {
      rental.remainingPaymentStatus = "REMAINING_RECEIVED";
      modified = true;
    }

    if (rental.rentalStatus === "PENDING_ADVANCE") {
      const lower = legacyStatus.toLowerCase();
      if (lower === "active") rental.rentalStatus = "ACTIVE_RENTAL";
      else if (lower === "completed") rental.rentalStatus = "COMPLETED";
      else if (lower === "cancelled") rental.rentalStatus = "CANCELLED";
      else if (lower === "booked") rental.rentalStatus = "CONFIRMED";
      else rental.rentalStatus = "CONFIRMED";
      modified = true;
    }

    if (!rental.paymentMethod) {
      rental.paymentMethod = "CASH";
      modified = true;
    }

    // Save only if document was actually modified
    if (modified) {
      await rental.save();
      stats.rentals.migrated++;
    } else {
      stats.rentals.alreadyMigrated++;
    }
  }

  console.log(`✅ Rentals: ${stats.rentals.migrated} migrated, ${stats.rentals.alreadyMigrated} already migrated/unchanged (total: ${stats.rentals.inspected}).`);
  if (stats.rentals.specialHandling > 0) {
    console.log(`ℹ️  Rentals requiring special handling (missing referenced product): ${stats.rentals.specialHandling}`);
  }
  if (stats.rentals.unresolved > 0) {
    console.warn(`⚠️  Rentals that could not be safely migrated (missing all product references): ${stats.rentals.unresolved}`);
  }

  console.log("\n==================================================");
  console.log("🎉 Database Migration Summary");
  console.log("==================================================");
  console.log(`- Products: ${stats.products.inspected} inspected | ${stats.products.updated} updated | ${stats.products.unchanged} unchanged`);
  console.log(`- Users:    ${stats.users.inspected} inspected | ${stats.users.updated} updated | ${stats.users.unchanged} unchanged`);
  console.log(`- Rentals:  ${stats.rentals.inspected} inspected | ${stats.rentals.migrated} migrated | ${stats.rentals.alreadyMigrated} already up-to-date`);
  console.log(`            ${stats.rentals.specialHandling} special handling | ${stats.rentals.unresolved} unresolved`);
  console.log("==================================================\n");

  if (shouldClose && mongoose.connection.readyState !== 0 && !options.keepOpen) {
    await mongoose.connection.close();
  }

  return {
    success: stats.rentals.unresolved === 0,
    stats
  };
}

if (process.argv[1] && process.argv[1].endsWith("migrate.js")) {
  runMigration()
    .then((result) => {
      if (!result.success) {
        console.warn("Migration finished with unresolved records. Review logs above.");
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration error:", err.message);
      process.exit(1);
    });
}

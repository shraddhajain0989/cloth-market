import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";
import { logAction } from "../models/AuditLog.js";
import { fail, ok } from "../utils/respond.js";

export async function getDashboard(_req, res) {
  const [totalOrders, totalUsers, totalProducts, totalRentals, activeRentals, pendingAdvance, completedRentals, revenueAgg] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: "user" }),
    Product.countDocuments(),
    Rental.countDocuments(),
    Rental.countDocuments({ rentalStatus: "ACTIVE_RENTAL" }),
    Rental.countDocuments({ advanceStatus: "ADVANCE_PENDING" }),
    Rental.countDocuments({ rentalStatus: "COMPLETED" }),
    Rental.aggregate([{ $group: { _id: null, total: { $sum: "$rentalAmount" } } }])
  ]);

  const revenue = revenueAgg[0]?.total || 0;

  // Real sales chart — last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const salesAgg = await Rental.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        sales: { $sum: "$rentalAmount" }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: "$_id", sales: 1 } }
  ]);

  const topProducts = await Product.find().sort({ reviewsCount: -1 }).limit(4);

  return ok(
    res,
    {
      kpis: {
        revenue,
        rentals: totalRentals,
        activeRentals,
        pendingAdvance,
        completedRentals,
        users: totalUsers,
        clothes: totalProducts
      },
      salesChart: salesAgg,
      topProducts
    },
    "Admin dashboard fetched."
  );
}

/**
 * List all rentals for Admin with customer information.
 */
export async function listAdminRentals(req, res) {
  const { status } = req.query;
  const query = status ? { rentalStatus: status } : {};
  const rentals = await Rental.find(query).sort({ createdAt: -1 });

  // Attach customer details
  const userIds = [...new Set(rentals.map((r) => r.userId))];
  const users = await User.find({ _id: { $in: userIds } }).select("name email");
  const userMap = users.reduce((acc, u) => {
    acc[u.id] = { name: u.name, email: u.email };
    return acc;
  }, {});

  const enriched = rentals.map((r) => {
    const obj = r.toObject();
    obj.customer = userMap[r.userId] || { name: "Customer", email: "N/A" };
    return obj;
  });

  return ok(res, enriched, "Admin rentals fetched.");
}

/**
 * Admin records ₹50 advance received (Cash):
 * Status transitions from PENDING_ADVANCE to CONFIRMED.
 */
export async function confirmAdvance(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (rental.advanceStatus === "ADVANCE_RECEIVED") {
    return fail(res, 400, "Advance payment has already been recorded as received.");
  }

  rental.advanceStatus = "ADVANCE_RECEIVED";
  rental.rentalStatus = "CONFIRMED";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_confirmed_advance",
    targetId: rental.id,
    metadata: { advanceAmount: rental.advanceAmount }
  });

  return ok(res, rental, "Advance recorded as received. Rental confirmed.");
}

/**
 * Admin records Handover Inspection and baseline photos.
 */
export async function recordHandoverInspection(req, res) {
  const { condition, stains, tears, brokenButtons, brokenZipper, fabricDamage, missingAccessories, notes, photos } = req.body;
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (rental.advanceStatus !== "ADVANCE_RECEIVED") {
    return fail(res, 400, "Cannot perform handover inspection before confirmation advance is received.");
  }

  rental.handoverInspection = {
    condition: condition || "Good",
    stains: Boolean(stains),
    tears: Boolean(tears),
    brokenButtons: Boolean(brokenButtons),
    brokenZipper: Boolean(brokenZipper),
    fabricDamage: Boolean(fabricDamage),
    missingAccessories: Boolean(missingAccessories),
    notes: notes || "",
    photos: Array.isArray(photos) ? photos : [],
    inspectedBy: req.user.name || "Admin",
    inspectedAt: new Date(),
    customerAcknowledged: false
  };

  rental.rentalStatus = "HANDOVER_INSPECTION";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_recorded_handover_inspection",
    targetId: rental.id,
    metadata: { condition, notes }
  });

  return ok(res, rental, "Handover inspection and baseline evidence recorded.");
}

/**
 * Admin records remaining cash payment received at handover.
 * Enforces that advance was received, handover inspection was completed,
 * and prevents recording the same payment twice.
 */
export async function recordRemainingPayment(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (rental.remainingPaymentStatus === "REMAINING_RECEIVED") {
    return fail(res, 400, "Remaining payment has already been recorded as received.");
  }

  if (rental.advanceStatus !== "ADVANCE_RECEIVED") {
    return fail(res, 400, "Cannot collect remaining payment before the ₹50 confirmation advance is received.");
  }

  if (!rental.handoverInspection?.inspectedAt) {
    return fail(res, 400, "Handover inspection with photos must be recorded before remaining payment and activation.");
  }

  rental.remainingPaymentStatus = "REMAINING_RECEIVED";
  rental.rentalStatus = "ACTIVE_RENTAL";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_recorded_remaining_payment",
    targetId: rental.id,
    metadata: { remainingAmount: rental.remainingAmount }
  });

  return ok(res, rental, "Remaining payment recorded. Rental is now ACTIVE.");
}

/**
 * Admin reviews and approves or rejects a customer extension request.
 */
export async function reviewExtension(req, res) {
  const { decision } = req.body; // "APPROVED" or "REJECTED"
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  const pendingExtension = rental.extensionHistory.find((e) => e.status === "REQUESTED");
  if (!pendingExtension) {
    return fail(res, 400, "No pending extension request found for this rental.");
  }

  if (decision === "APPROVED") {
    pendingExtension.status = "APPROVED";
    pendingExtension.reviewedAt = new Date();
    pendingExtension.reviewedBy = req.user.name;

    rental.currentEndDate = pendingExtension.requestedEndDate;
    rental.extensionAmount = (rental.extensionAmount || 0) + pendingExtension.additionalAmount;
    rental.rentalAmount = rental.rentalAmount + pendingExtension.additionalAmount;
    rental.remainingAmount = rental.remainingAmount + pendingExtension.additionalAmount;
    rental.rentalStatus = "EXTENDED";
  } else {
    pendingExtension.status = "REJECTED";
    pendingExtension.reviewedAt = new Date();
    pendingExtension.reviewedBy = req.user.name;
    rental.rentalStatus = "ACTIVE_RENTAL";
  }

  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: `admin_extension_${decision.toLowerCase()}`,
    targetId: rental.id,
    metadata: { decision, requestedEndDate: pendingExtension.requestedEndDate }
  });

  return ok(res, rental, `Extension request ${decision.toLowerCase()} successfully.`);
}

/**
 * Admin records Return Inspection with photos.
 * Compares against baseline handover inspection.
 */
export async function recordReturnInspection(req, res) {
  const { condition, stains, tears, fabricDamage, missingAccessories, brokenButtons, brokenZipper, otherDamage, notes, photos } = req.body;
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  rental.returnInspection = {
    condition: condition || "Good",
    stains: Boolean(stains),
    tears: Boolean(tears),
    fabricDamage: Boolean(fabricDamage),
    missingAccessories: Boolean(missingAccessories),
    brokenButtons: Boolean(brokenButtons),
    brokenZipper: Boolean(brokenZipper),
    otherDamage: Boolean(otherDamage),
    notes: notes || "",
    photos: Array.isArray(photos) ? photos : [],
    inspectedBy: req.user.name || "Admin",
    inspectedAt: new Date()
  };

  // Check if new damage is suspected
  const hasNewStains = stains && !rental.handoverInspection?.stains;
  const hasNewTears = tears && !rental.handoverInspection?.tears;
  const hasOtherDamage = Boolean(otherDamage || fabricDamage || missingAccessories);

  if (hasNewStains || hasNewTears || hasOtherDamage) {
    rental.rentalStatus = "DAMAGE_REPORTED";
  } else {
    rental.rentalStatus = "COMPLETED";
  }

  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_recorded_return_inspection",
    targetId: rental.id,
    metadata: { condition, newDamageSuspected: rental.rentalStatus === "DAMAGE_REPORTED" }
  });

  return ok(res, rental, "Return inspection recorded.");
}

/**
 * Admin reports damage and specifies assessment/repair cost.
 * Damage charge is kept separate from original rental price.
 */
export async function reportDamage(req, res) {
  const { description, severity, amount, photos } = req.body;
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  rental.damageReport = {
    damageDetected: true,
    description: description || "Item damaged upon return",
    severity: severity || "minor",
    amount: Number(amount) || 0,
    photos: Array.isArray(photos) ? photos : [],
    status: "DAMAGE_REPORTED",
    reportedAt: new Date(),
    reportedBy: req.user.name
  };

  rental.rentalStatus = "DAMAGE_REPORTED";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_reported_damage",
    targetId: rental.id,
    metadata: { amount, severity, description }
  });

  return ok(res, rental, "Damage report created successfully.");
}

/**
 * Admin resolves damage settlement and completes rental.
 */
export async function resolveDamage(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (rental.damageReport) {
    rental.damageReport.status = "DAMAGE_RESOLVED";
    rental.damageReport.resolvedAt = new Date();
  }

  rental.rentalStatus = "COMPLETED";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_resolved_damage",
    targetId: rental.id
  });

  return ok(res, rental, "Damage settlement resolved and rental completed.");
}

/**
 * Admin marks rental as COMPLETED.
 */
export async function completeRental(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  rental.rentalStatus = "COMPLETED";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_completed_rental",
    targetId: rental.id
  });

  return ok(res, rental, "Rental marked as COMPLETED.");
}

export const OPERATIONAL_RENTAL_STATUSES = [
  "PENDING_ADVANCE",
  "CONFIRMED",
  "READY_FOR_HANDOVER",
  "HANDOVER_INSPECTION",
  "ACTIVE_RENTAL",
  "EXTENSION_REQUESTED",
  "EXTENDED",
  "RETURN_INSPECTION",
  "DAMAGE_REPORTED",
  "DAMAGE_SETTLEMENT"
];

/**
 * Bulk remove clothes from active inventory safely.
 * Preserves historical rental records and prevents deletion if operational rentals exist.
 */
export async function bulkRemoveProducts(req, res) {
  const { productIds } = req.body || {};

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return fail(res, 400, "Please provide an array of productIds to remove.");
  }

  const rawIds = productIds.map((id) => (typeof id === "string" ? id.trim() : String(id || ""))).filter(Boolean);
  const uniqueIds = [...new Set(rawIds)];

  if (uniqueIds.length === 0) {
    return fail(res, 400, "No valid product IDs provided.");
  }

  const removed = [];
  const blocked = [];

  for (const id of uniqueIds) {
    // 1. Validate ID format
    if (!id || typeof id !== "string" || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
      blocked.push({
        productId: id,
        status: "blocked",
        reason: "Invalid product ID format."
      });
      continue;
    }

    // 2. Fetch product
    const product = await Product.findById(id);
    if (!product) {
      blocked.push({
        productId: id,
        status: "blocked",
        reason: "Product not found in catalog."
      });
      continue;
    }

    // 3. Check for active/pending/upcoming/operational rentals
    const activeRental = await Rental.findOne({
      $and: [
        { $or: [{ clothId: id }, { productId: id }] },
        {
          $or: [
            { rentalStatus: { $in: OPERATIONAL_RENTAL_STATUSES } },
            { rentalStatus: { $exists: false }, status: { $in: OPERATIONAL_RENTAL_STATUSES } }
          ]
        }
      ]
    });

    if (activeRental) {
      const currentStatus = activeRental.rentalStatus || activeRental.status || "ACTIVE";
      blocked.push({
        productId: id,
        name: product.name,
        status: "blocked",
        reason: `Product has an active or upcoming rental (status: ${currentStatus}).`
      });
      continue;
    }

    // 4. Safe removal:
    // Soft-remove by deactivating availability to ensure historical rental references and snapshots remain 100% intact.
    product.available = false;
    product.stock = 0;
    if (Array.isArray(product.sizeVariants)) {
      product.sizeVariants.forEach((v) => {
        v.available = false;
        v.stock = 0;
      });
    }
    await product.save();

    removed.push({
      productId: id,
      name: product.name,
      status: "removed"
    });
  }

  // 5. Audit Logging
  if (req.user) {
    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "BULK_REMOVE_PRODUCTS",
      targetType: "product",
      metadata: {
        selectedProductIds: uniqueIds,
        removedProductIds: removed.map((r) => r.productId),
        blockedProductIds: blocked.map((b) => b.productId),
        blockedDetails: blocked,
        counts: {
          selected: uniqueIds.length,
          removed: removed.length,
          blocked: blocked.length
        }
      }
    });
  }

  let message = "";
  if (blocked.length === 0) {
    message = `${removed.length} ${removed.length === 1 ? "cloth" : "clothes"} removed successfully.`;
  } else if (removed.length === 0) {
    message = `0 clothes removed. ${blocked.length} ${blocked.length === 1 ? "could not be removed because it has active/upcoming rentals or errors." : "could not be removed because they have active/upcoming rentals."}`;
  } else {
    message = `${removed.length} ${removed.length === 1 ? "cloth" : "clothes"} removed. ${blocked.length} could not be removed because they have active/upcoming rentals.`;
  }

  return ok(
    res,
    {
      removed,
      blocked,
      counts: {
        selected: uniqueIds.length,
        removed: removed.length,
        blocked: blocked.length
      }
    },
    message
  );
}

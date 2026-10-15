import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { logAction } from "../models/AuditLog.js";
import { reserveRentalSlot, releaseRentalSlot, extendRentalSlot } from "../utils/rentalReservation.js";
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
 * Admin / Master Admin records payment received (manual WhatsApp payment verified):
 * Status transitions to CONFIRMED and inventory slot is atomically reserved.
 */
export async function confirmPaymentReceived(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (
    rental.advanceStatus === "ADVANCE_RECEIVED" &&
    ["CONFIRMED", "PAYMENT_DONE", "RENT_INITIATED", "RENT_PERIOD", "RENT_RECEIVED"].includes(rental.rentalStatus)
  ) {
    return ok(res, rental, "Payment has already been recorded as received.");
  }

  if (rental.rentalStatus === "CANCELLED") {
    return fail(res, 400, "Cannot confirm payment for a cancelled rental.");
  }
  if (rental.rentalStatus === "COMPLETED") {
    return fail(res, 400, "Cannot confirm payment for an already completed rental.");
  }

  try {
    await reserveRentalSlot(rental);
  } catch (err) {
    return fail(res, 400, err.message);
  }

  // Atomically update rental status
  const updatedRental = await Rental.findOneAndUpdate(
    { _id: rental._id, rentalStatus: { $nin: ["CANCELLED", "COMPLETED"] } },
    {
      $set: {
        advanceStatus: "ADVANCE_RECEIVED",
        rentalStatus: "CONFIRMED",
        status: "CONFIRMED",
        remainingAmount: 0,
        remainingPaymentStatus: "REMAINING_RECEIVED"
      }
    },
    { new: true }
  );

  if (!updatedRental) {
    const recheck = await Rental.findById(rental._id);
    if (recheck?.advanceStatus === "ADVANCE_RECEIVED") {
      return ok(res, recheck, "Payment has already been recorded as received.");
    }
    await releaseRentalSlot(rental.clothId, rental._id);
    return fail(res, 400, "Rental status could not be updated.");
  }

  // Also update linked Payment if exists (including previously rejected payment records)
  const sizeRegex = updatedRental.size ? new RegExp(`^${String(updatedRental.size).trim()}$`, "i") : null;
  const prodId = String(updatedRental.clothId || updatedRental.productId);
  const custId = String(updatedRental.userId);

  await Payment.updateMany(
    {
      $or: [
        { rentalId: String(updatedRental._id) },
        {
          $and: [
            { $or: [{ rentalId: { $exists: false } }, { rentalId: null }, { rentalId: "" }] },
            { $or: [{ productId: prodId }, { clothId: prodId }] },
            { customerId: custId },
            ...(sizeRegex ? [{ size: { $regex: sizeRegex } }] : [])
          ]
        }
      ],
      status: { $nin: ["Verified", "Cancelled"] }
    },
    {
      $set: {
        rentalId: String(updatedRental._id),
        status: "Verified",
        verifiedBy: req.user?.name || req.user?.email || "Admin",
        verifiedAt: new Date(),
        rejectionReason: ""
      }
    }
  );

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_confirmed_payment",
    targetId: updatedRental.id,
    metadata: { rentalAmount: updatedRental.rentalAmount }
  });

  return ok(res, updatedRental, "Payment recorded as received. Rental confirmed.");
}

// Backward-compatible alias
export const confirmAdvance = confirmPaymentReceived;

/**
 * Admin records Handover Inspection and baseline photos.
 */
export async function recordHandoverInspection(req, res) {
  const { condition, stains, tears, brokenButtons, brokenZipper, fabricDamage, missingAccessories, notes, photos } = req.body;
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (["CANCELLED", "COMPLETED"].includes(rental.rentalStatus)) {
    return fail(res, 400, `Cannot perform handover inspection for '${rental.rentalStatus}' rental.`);
  }

  const ALLOWED_HANDOVER_STATUSES = [
    "CONFIRMED",
    "PAYMENT_DONE",
    "RENT_INITIATED",
    "READY_FOR_HANDOVER",
    "HANDOVER_INSPECTION",
    "RENT_PERIOD",
    "ACTIVE_RENTAL"
  ];
  const isPaid = rental.advanceStatus === "ADVANCE_RECEIVED" || ALLOWED_HANDOVER_STATUSES.includes(rental.rentalStatus);
  if (!isPaid) {
    return fail(res, 400, "Cannot perform handover inspection before payment is confirmed.");
  }

  rental.advanceStatus = "ADVANCE_RECEIVED";
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
    inspectedBy: req.user?.name || req.user?.email || "Admin",
    inspectedAt: new Date(),
    customerAcknowledged: false
  };

  if (!["RENT_PERIOD", "ACTIVE_RENTAL"].includes(rental.rentalStatus)) {
    rental.rentalStatus = "HANDOVER_INSPECTION";
    rental.status = "HANDOVER_INSPECTION";
  }
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

  if (rental.remainingPaymentStatus === "REMAINING_RECEIVED" && rental.rentalStatus === "ACTIVE_RENTAL") {
    return fail(res, 400, "Remaining payment has already been recorded as received.");
  }

  if (rental.advanceStatus !== "ADVANCE_RECEIVED") {
    return fail(res, 400, "Cannot collect remaining payment before payment confirmation is recorded.");
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
 * Admin marks Rent Initiated (after payment done/confirmed)
 */
export async function initiateRent(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (rental.advanceStatus !== "ADVANCE_RECEIVED" && !["PAYMENT_DONE", "CONFIRMED"].includes(rental.rentalStatus)) {
    return fail(res, 400, "Cannot initiate rent before payment has been confirmed.");
  }

  if (["CANCELLED", "COMPLETED", "RENT_RECEIVED"].includes(rental.rentalStatus)) {
    return fail(res, 400, `Cannot initiate rent for rental in '${rental.rentalStatus}' state.`);
  }

  rental.rentalStatus = "RENT_INITIATED";
  rental.status = "RENT_INITIATED";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_initiated_rent",
    targetId: rental.id,
    metadata: { rentalStatus: rental.rentalStatus }
  });

  return ok(res, rental, "Rent initiated successfully.");
}

/**
 * Admin marks Rent Period (active rental period in progress)
 */
export async function startRentPeriod(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (["CANCELLED", "COMPLETED"].includes(rental.rentalStatus)) {
    return fail(res, 400, `Cannot start rent period for rental in '${rental.rentalStatus}' state.`);
  }

  const validPrior = [
    "RENT_INITIATED",
    "PAYMENT_DONE",
    "CONFIRMED",
    "HANDOVER_INSPECTION",
    "READY_FOR_HANDOVER"
  ];
  if (!validPrior.includes(rental.rentalStatus)) {
    return fail(res, 400, `Cannot start rent period from '${rental.rentalStatus}' state. Payment must be confirmed and rent initiated.`);
  }

  rental.rentalStatus = "RENT_PERIOD";
  rental.status = "RENT_PERIOD";
  rental.advanceStatus = "ADVANCE_RECEIVED";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_started_rent_period",
    targetId: rental.id,
    metadata: { rentalStatus: rental.rentalStatus }
  });

  return ok(res, rental, "Rental period started. Outfit is now active with customer.");
}

/**
 * Admin reviews and approves or rejects a customer extension request.
 * Atomically verifies and updates Product.activeRentals reservation slot.
 */
export async function reviewExtension(req, res) {
  const { decision } = req.body; // "APPROVED" or "REJECTED"
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  const pendingExtension = rental.extensionHistory.find((e) => e.status === "REQUESTED");
  if (!pendingExtension) {
    if (decision === "APPROVED" && rental.rentalStatus === "EXTENDED") {
      return ok(res, rental, "Extension has already been approved.");
    }
    return fail(res, 400, "No pending extension request found for this rental.");
  }

  if (decision === "APPROVED") {
    // Atomically revalidate availability and update the reservation slot on the Product
    try {
      await extendRentalSlot(rental, pendingExtension.requestedEndDate);
    } catch (err) {
      return fail(res, 400, `Cannot approve extension: ${err.message}`);
    }

    pendingExtension.status = "APPROVED";
    pendingExtension.reviewedAt = new Date();
    pendingExtension.reviewedBy = req.user.name || "Admin";

    rental.currentEndDate = pendingExtension.requestedEndDate;
    rental.extensionAmount = (rental.extensionAmount || 0) + pendingExtension.additionalAmount;
    rental.rentalAmount = rental.rentalAmount + pendingExtension.additionalAmount;
    rental.remainingAmount = rental.remainingAmount + pendingExtension.additionalAmount;
    rental.rentalStatus = "EXTENDED";
  } else {
    pendingExtension.status = "REJECTED";
    pendingExtension.reviewedAt = new Date();
    pendingExtension.reviewedBy = req.user.name || "Admin";
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

  if (rental.rentalStatus === "CANCELLED") {
    return fail(res, 400, "Cannot report damage for a cancelled rental.");
  }

  rental.damageReport = {
    damageDetected: true,
    description: description || "Item damaged upon return",
    severity: severity || "minor",
    amount: Number(amount) || 0,
    photos: Array.isArray(photos) ? photos : [],
    status: "DAMAGE_REPORTED",
    reportedAt: new Date(),
    reportedBy: req.user?.name || req.user?.email || "Admin"
  };

  rental.rentalStatus = "DAMAGE_REPORTED";
  rental.status = "DAMAGE_REPORTED";
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
  rental.status = "COMPLETED";
  rental.productReceived = true;
  rental.productReceivedAt = rental.productReceivedAt || new Date();
  await rental.save();

  // Release reservation slot
  const clothId = rental.clothId || rental.productId;
  if (clothId) {
    await releaseRentalSlot(clothId, rental._id);
  }

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_resolved_damage",
    targetId: rental.id
  });

  return ok(res, rental, "Damage settlement resolved and rental completed.");
}

/**
 * Admin / Master Admin marks product received when the dress is returned to the business.
 * - Enforces that payment has been received (cannot mark product received on unpaid rentals)
 * - Prevents bypassing required payment or rental-state validation
 * - Validates allowed source rental status
 * - Sets productReceived: true, productReceivedAt: new Date(), rentalStatus: "COMPLETED"
 * - Releases reserved inventory slot
 */
export async function markProductReceived(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (
    rental.rentalStatus === "PENDING_ADVANCE" ||
    rental.rentalStatus === "ADDED_TO_CART" ||
    rental.advanceStatus !== "ADVANCE_RECEIVED"
  ) {
    return fail(
      res,
      400,
      "Cannot mark product received for an unpaid rental. Payment must be confirmed first."
    );
  }

  if (rental.rentalStatus === "CANCELLED") {
    return fail(res, 400, "Cannot mark product received for a cancelled rental.");
  }

  if (rental.rentalStatus === "COMPLETED" || rental.rentalStatus === "RENT_RECEIVED") {
    return fail(res, 400, "Product has already been marked as received and rental is completed.");
  }

  const VALID_RETURN_STATUSES = [
    "PAYMENT_DONE",
    "CONFIRMED",
    "READY_FOR_HANDOVER",
    "HANDOVER_INSPECTION",
    "RENT_INITIATED",
    "RENT_PERIOD",
    "ACTIVE_RENTAL",
    "EXTENSION_REQUESTED",
    "EXTENDED",
    "RETURN_INSPECTION",
    "DAMAGE_REPORTED",
    "DAMAGE_SETTLEMENT"
  ];

  if (!VALID_RETURN_STATUSES.includes(rental.rentalStatus)) {
    return fail(
      res,
      400,
      `Cannot mark product received for rental in '${rental.rentalStatus}' state.`
    );
  }

  const updatedRental = await Rental.findOneAndUpdate(
    { _id: rental._id, rentalStatus: { $in: VALID_RETURN_STATUSES } },
    {
      $set: {
        rentalStatus: "COMPLETED",
        status: "COMPLETED",
        productReceived: true,
        productReceivedAt: new Date()
      }
    },
    { new: true }
  );

  if (!updatedRental) {
    const recheck = await Rental.findById(rental._id);
    if (recheck?.rentalStatus === "COMPLETED" || recheck?.rentalStatus === "RENT_RECEIVED") {
      return fail(res, 400, "Product has already been marked as received and rental is completed.");
    }
    return fail(res, 400, "Rental status could not be updated.");
  }

  // Release reservation slot
  const clothId = updatedRental.clothId || updatedRental.productId;
  if (clothId) {
    await releaseRentalSlot(clothId, updatedRental._id);
  }

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "admin_marked_product_received",
    targetId: updatedRental.id
  });

  return ok(res, updatedRental, "Product marked as received. Rental completed and inventory released.");
}

// Backward-compatible alias
export const completeRental = markProductReceived;

/**
 * Admin cancels rental and releases reserved inventory.
 * Uses hardened implementation from rentalController with atomic concurrency,
 * operational status guards, and reservation-release rollback.
 */
export { cancelRental } from "./rentalController.js";

export const OPERATIONAL_RENTAL_STATUSES = [
  "PENDING_ADVANCE",
  "CONFIRMED",
  "PAYMENT_DONE",
  "RENT_INITIATED",
  "READY_FOR_HANDOVER",
  "HANDOVER_INSPECTION",
  "RENT_PERIOD",
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

export const markRentReceived = markProductReceived;
export const markPaymentDone = confirmPaymentReceived;


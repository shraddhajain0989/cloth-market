import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { logAction } from "../models/AuditLog.js";
import { fail, ok } from "../utils/respond.js";

/**
 * List rentals: Customer can ONLY see their own rentals (Customer Data Isolation).
 * Admin and Master Admin can view all rentals.
 */
export async function listRentals(req, res) {
  const isAdmin = ["admin", "master"].includes(req.user.role);
  const query = isAdmin ? {} : { userId: req.user.id };
  const rentals = await Rental.find(query).sort({ createdAt: -1 });
  return ok(res, rentals, "Rentals fetched.");
}

/**
 * Get single rental by ID with IDOR protection.
 */
export async function getRental(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  const isAdmin = ["admin", "master"].includes(req.user.role);
  if (!isAdmin && rental.userId !== req.user.id) {
    return fail(res, 403, "You do not have permission to access this rental.");
  }

  return ok(res, rental, "Rental fetched.");
}

/**
 * Check date-aware availability for a product and size.
 */
export async function checkAvailability(req, res) {
  const { productId, size, pickupDate, returnDate } = req.query;
  if (!productId || !size || !pickupDate || !returnDate) {
    return fail(res, 400, "Product ID, size, pickup date, and return date are required.");
  }

  const product = await Product.findById(productId);
  if (!product || !product.available) {
    return fail(res, 404, "Product not available.");
  }

  const variant = product.sizeVariants?.find((v) => v.size === size);
  const sizeStock = variant ? variant.stock : (product.sizes?.includes(size) ? product.stock : 0);

  const start = new Date(pickupDate);
  const end = new Date(returnDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return fail(res, 400, "Invalid date range.");
  }

  const pickupStr = start.toISOString().split("T")[0];
  const returnStr = end.toISOString().split("T")[0];

  // Count overlapping active rentals for this product and size
  const overlappingCount = await Rental.countDocuments({
    clothId: product.id,
    size,
    rentalStatus: { $nin: ["CANCELLED", "COMPLETED"] },
    $or: [
      { rentalStartDate: { $lte: returnStr }, currentEndDate: { $gte: pickupStr } }
    ]
  });

  const availableUnits = Math.max(0, sizeStock - overlappingCount);
  const isAvailable = availableUnits > 0;
  const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const totalRentalAmount = durationDays * product.rentPrice;
  const advanceAmount = 50;
  const remainingAmount = Math.max(0, totalRentalAmount - advanceAmount);

  return ok(
    res,
    {
      available: isAvailable,
      sizeStock,
      overlappingCount,
      availableUnits,
      durationDays,
      dailyRate: product.rentPrice,
      totalRentalAmount,
      advanceAmount,
      remainingAmount
    },
    isAvailable ? "Item is available." : "Item is fully booked for selected dates."
  );
}

/**
 * Create a new rental booking:
 * - Authoritative price calculation from database (dailyRate * durationDays)
 * - Mandatory size selection and size variant stock validation
 * - Date-aware overlap prevention
 * - ₹50 advance included in total rental price (advance: 50, remaining: total - 50)
 * - Zero tax, Cash only
 * - Initial state: PENDING_ADVANCE
 */
export async function createRental(req, res) {
  const { productId, size, pickupDate, returnDate } = req.body;
  if (!productId || !size || !pickupDate || !returnDate) {
    return fail(res, 400, "Product ID, size, pickup date, and return date are required.");
  }

  const cleanProductId = String(productId).trim();
  const product = await Product.findById(cleanProductId);
  if (!product || !product.available) {
    return fail(res, 404, "Cloth item is currently unavailable.");
  }

  if (product.rentPrice <= 0) {
    return fail(res, 400, "This cloth item is not listed for rental.");
  }

  // Validate size availability in product
  const variant = product.sizeVariants?.find((v) => v.size === size);
  let sizeStock = 0;
  if (variant) {
    if (!variant.available || variant.stock <= 0) {
      return fail(res, 400, `Size '${size}' is currently out of stock.`);
    }
    sizeStock = variant.stock;
  } else if (product.sizes?.includes(size)) {
    sizeStock = product.stock || 1;
  } else {
    return fail(res, 400, `Size '${size}' is not supported for this product.`);
  }

  const start = new Date(pickupDate);
  const end = new Date(returnDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return fail(res, 400, "Invalid date format.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    return fail(res, 400, "Rental start date cannot be in the past.");
  }

  if (end <= start) {
    return fail(res, 400, "Rental return date must be at least 1 day after start date.");
  }

  const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const pickupStr = start.toISOString().split("T")[0];
  const returnStr = end.toISOString().split("T")[0];

  // DATE-AWARE INVENTORY: Check overlapping bookings for the exact size
  const overlappingCount = await Rental.countDocuments({
    clothId: product.id,
    size,
    rentalStatus: { $nin: ["CANCELLED", "COMPLETED"] },
    $or: [
      { rentalStartDate: { $lte: returnStr }, currentEndDate: { $gte: pickupStr } }
    ]
  });

  if (overlappingCount >= sizeStock) {
    return fail(
      res,
      400,
      `Cloth '${product.name}' (Size: ${size}) is fully booked between ${pickupStr} and ${returnStr}.`
    );
  }

  // Authoritative price calculation:
  // Rental price = dailyRate * durationDays
  // Advance amount = 50 (INCLUDED in total rental amount, NOT an extra fee)
  // Remaining amount = rentalAmount - 50
  const dailyRate = product.rentPrice;
  const totalRentalAmount = durationDays * dailyRate;
  const advanceAmount = 50;
  const remainingAmount = Math.max(0, totalRentalAmount - advanceAmount);

  const rental = await Rental.create({
    userId: req.user.id,
    clothId: product.id,
    productId: product.id,
    productName: product.name,
    clothSnapshot: {
      name: product.name,
      category: product.category,
      image: product.images?.[0] || "",
      rentPrice: dailyRate
    },
    size,
    rentalStartDate: pickupStr,
    originalEndDate: returnStr,
    currentEndDate: returnStr,
    rentalDuration: durationDays,
    rentalAmount: totalRentalAmount,
    originalRentalAmount: totalRentalAmount,
    priceSnapshot: {
      dailyRate,
      durationDays,
      totalRental: totalRentalAmount
    },
    advanceAmount,
    advanceStatus: "ADVANCE_PENDING",
    remainingAmount,
    remainingPaymentStatus: "REMAINING_PENDING",
    paymentMethod: "CASH",
    rentalStatus: "PENDING_ADVANCE",
    // Backward compatibility aliases
    durationDays,
    total: totalRentalAmount,
    pickupDate: pickupStr,
    returnDate: returnStr,
    status: "PENDING_ADVANCE"
  });

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "create_rental",
    targetId: rental.id,
    metadata: { totalRentalAmount, size, pickupStr, returnStr }
  });

  return ok(res, rental, "Rental booked. Please pay ₹50 advance to Admin to confirm.");
}

/**
 * Customer acknowledges handover inspection and photos.
 */
export async function acknowledgeHandover(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (rental.userId !== req.user.id) {
    return fail(res, 403, "You do not have permission to acknowledge this rental.");
  }

  if (!["READY_FOR_HANDOVER", "HANDOVER_INSPECTION", "ACTIVE_RENTAL"].includes(rental.rentalStatus)) {
    return fail(res, 400, "Handover inspection is not ready for acknowledgement.");
  }

  rental.handoverInspection.customerAcknowledged = true;
  rental.handoverInspection.customerAcknowledgedAt = new Date();
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "customer_acknowledged_handover",
    targetId: rental.id
  });

  return ok(res, rental, "Handover condition acknowledged successfully.");
}

/**
 * Customer requests rental extension:
 * - Checks availability for extended dates
 * - Calculates additional amount at original dailyRate
 * - Advance amount is NOT charged again
 */
export async function requestExtension(req, res) {
  const { requestedEndDate } = req.body;
  if (!requestedEndDate) return fail(res, 400, "New requested return date is required.");

  const rental = await Rental.findById(req.params.id);
  if (!rental) return fail(res, 404, "Rental not found.");

  if (rental.userId !== req.user.id) {
    return fail(res, 403, "You do not have permission to extend this rental.");
  }

  if (!["CONFIRMED", "READY_FOR_HANDOVER", "ACTIVE_RENTAL", "EXTENDED"].includes(rental.rentalStatus)) {
    return fail(res, 400, `Cannot extend rental in current status '${rental.rentalStatus}'.`);
  }

  const currentEnd = new Date(rental.currentEndDate);
  const newEnd = new Date(requestedEndDate);
  if (isNaN(newEnd.getTime()) || newEnd <= currentEnd) {
    return fail(res, 400, "Extended return date must be after current return date.");
  }

  const additionalDays = Math.max(1, Math.ceil((newEnd - currentEnd) / (1000 * 60 * 60 * 24)));
  const dailyRate = rental.priceSnapshot?.dailyRate || 0;
  const additionalAmount = additionalDays * dailyRate;

  const currentEndStr = currentEnd.toISOString().split("T")[0];
  const newEndStr = newEnd.toISOString().split("T")[0];

  // Check overlap for extension period
  const product = await Product.findById(rental.clothId);
  const variant = product?.sizeVariants?.find((v) => v.size === rental.size);
  const sizeStock = variant ? variant.stock : (product?.stock || 1);

  const overlappingCount = await Rental.countDocuments({
    clothId: rental.clothId,
    size: rental.size,
    _id: { $ne: rental.id },
    rentalStatus: { $nin: ["CANCELLED", "COMPLETED"] },
    $or: [
      { rentalStartDate: { $lte: newEndStr }, currentEndDate: { $gte: currentEndStr } }
    ]
  });

  if (overlappingCount >= sizeStock) {
    return fail(res, 400, "Item is already booked by another customer for the requested extension dates.");
  }

  rental.extensionHistory.push({
    requestedEndDate: newEndStr,
    previousEndDate: rental.currentEndDate,
    additionalDays,
    additionalAmount,
    status: "REQUESTED",
    requestedAt: new Date()
  });

  rental.rentalStatus = "EXTENSION_REQUESTED";
  await rental.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "requested_rental_extension",
    targetId: rental.id,
    metadata: { additionalDays, additionalAmount, requestedEndDate: newEndStr }
  });

  return ok(res, rental, "Extension requested. Waiting for Admin approval.");
}

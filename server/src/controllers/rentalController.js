import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { fail, ok } from "../utils/respond.js";

export async function listRentals(req, res) {
  const isAdmin = req.user.role === "admin" || req.user.role === "master";
  const query = isAdmin ? {} : { userId: req.user.id };
  const rentals = await Rental.find(query).sort({ createdAt: -1 });
  return ok(res, rentals, "Rentals fetched.");
}

export async function createRental(req, res) {
  const { productId, pickupDate, returnDate } = req.body;
  if (!productId || !pickupDate || !returnDate) {
    return fail(res, 400, "Product ID, pickup date, and return date are required.");
  }

  const cleanProductId = String(productId).trim();
  const product = await Product.findById(cleanProductId);
  if (!product || !product.available) {
    return fail(res, 404, "Product is currently unavailable for rental.");
  }

  if (product.rentPrice <= 0) {
    return fail(res, 400, "This product is not listed for rental.");
  }

  const start = new Date(pickupDate);
  const end = new Date(returnDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return fail(res, 400, "Invalid pickup date or return date format.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    return fail(res, 400, "Pickup date cannot be in the past.");
  }

  if (end <= start) {
    return fail(res, 400, "Return date must be at least 1 day after pickup date.");
  }

  const computedDurationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const pickupStr = start.toISOString().split("T")[0];
  const returnStr = end.toISOString().split("T")[0];

  // MULTI-UNIT RENTAL AVAILABILITY CHECK (STOCK-BASED OVERLAP PREVENTION)
  const activeOverlappingCount = await Rental.countDocuments({
    productId: product.id,
    status: { $in: ["Booked", "Active"] },
    $or: [
      { pickupDate: { $lte: returnStr }, returnDate: { $gte: pickupStr } }
    ]
  });

  const availableStockForRental = Math.max(1, product.stock || 1);

  if (activeOverlappingCount >= availableStockForRental) {
    return fail(
      res,
      400,
      `Product '${product.name}' is fully booked for rental between ${pickupStr} and ${returnStr} (All ${availableStockForRental} unit(s) reserved).`
    );
  }

  const total = computedDurationDays * product.rentPrice;

  const rental = await Rental.create({
    userId: req.user.id,
    productId: product.id,
    productName: product.name,
    durationDays: computedDurationDays,
    total,
    deposit: product.securityDeposit || 0,
    lateFeePerDay: 150,
    pickupDate: pickupStr,
    returnDate: returnStr,
    reminderStatus: "scheduled",
    damageClaimStatus: "none",
    status: "Booked"
  });

  return ok(res, rental, "Rental booked successfully.");
}

export async function createSubscriptionPlan(_req, res) {
  return ok(
    res,
    [
      { id: "plan-lite", name: "Lite Closet Pass", monthlyPrice: 999, itemsPerMonth: 2, depositWaiver: true },
      { id: "plan-pro", name: "Pro Closet Pass", monthlyPrice: 2499, itemsPerMonth: 6, depositWaiver: true }
    ],
    "Subscription plans fetched."
  );
}

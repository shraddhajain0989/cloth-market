import { Payment, PAYMENT_STATUSES } from "../models/Payment.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { logAction } from "../models/AuditLog.js";
import { reserveRentalSlot, releaseRentalSlot } from "../utils/rentalReservation.js";
import { ok, fail } from "../utils/respond.js";

/**
 * List all payments with filtering (Admin/Master only)
 */
export async function listPayments(req, res) {
  const { status, transactionType, search } = req.query;

  const query = {};
  if (status && PAYMENT_STATUSES.includes(status)) {
    query.status = status;
  }
  if (transactionType && ["RENT", "BUY"].includes(transactionType.toUpperCase())) {
    query.transactionType = transactionType.toUpperCase();
  }
  if (search) {
    query.$or = [
      { customerReference: { $regex: search, $options: "i" } },
      { productName: { $regex: search, $options: "i" } },
      { transactionReference: { $regex: search, $options: "i" } }
    ];
  }

  const payments = await Payment.find(query).sort({ createdAt: -1 });
  return ok(res, payments, "Payments fetched successfully.");
}

/**
 * Get single payment details
 */
export async function getPayment(req, res) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return fail(res, 404, "Payment record not found.");
  return ok(res, payment, "Payment record fetched.");
}

/**
 * Create a new payment record (Customer WhatsApp enquiry or Admin manual creation)
 */
export async function createPayment(req, res) {
  const {
    customerReference,
    customerPhone,
    productId,
    transactionType,
    size,
    quantity = 1,
    rentalStartDate,
    rentalEndDate,
    rentalDuration = 1,
    adminNotes,
    rentalId,
    orderId,
    status
  } = req.body;

  if (!productId || !transactionType || !size) {
    return fail(res, 400, "Product ID, transaction type, and size are required.");
  }

  const upperType = String(transactionType).trim().toUpperCase();
  if (!["RENT", "BUY"].includes(upperType)) {
    return fail(res, 400, "Transaction type must be RENT or BUY.");
  }

  const product = await Product.findById(productId);
  if (!product) {
    return fail(res, 404, "Product not found.");
  }
  if (product.available === false) {
    return fail(res, 400, "Product is not available.");
  }

  const trimmedSize = String(size).trim();
  let availableStock = 0;

  if (product.sizeVariants && product.sizeVariants.length > 0) {
    const variant = product.sizeVariants.find(
      (v) => v.size.toLowerCase() === trimmedSize.toLowerCase()
    );
    if (!variant) {
      return fail(res, 400, `Size '${trimmedSize}' is not offered for this product.`);
    }
    if (variant.available === false) {
      return fail(res, 400, `Size '${trimmedSize}' is currently marked unavailable.`);
    }
    availableStock = Number(variant.stock) || 0;
  } else {
    const matchedSize = (product.sizes || []).find(
      (s) => s.toLowerCase() === trimmedSize.toLowerCase()
    );
    if (!matchedSize) {
      return fail(res, 400, `Size '${trimmedSize}' is not offered for this product.`);
    }
    availableStock = Number(product.stock) || 0;
  }

  let finalExpected = 0;
  let finalTotal = 0;
  let finalAdvance = 0;
  let finalRemaining = 0;
  let validatedDuration = 1;
  let parsedQty = 1;

  if (upperType === "RENT") {
    const supportsRental =
      ["RENT", "BOTH"].includes(product.listingType) &&
      typeof product.rentPrice === "number" &&
      product.rentPrice > 0;
    if (!supportsRental) {
      return fail(res, 400, "This product is not available for rental.");
    }

    parsedQty = quantity !== undefined ? Number(quantity) : 1;
    if (!Number.isInteger(parsedQty) || parsedQty !== 1) {
      return fail(res, 400, "Rental quantity must be 1 unit.");
    }

    if (availableStock < 1) {
      return fail(res, 400, `Size '${trimmedSize}' is currently out of stock.`);
    }

    if (rentalStartDate || rentalEndDate) {
      if (!rentalStartDate || !rentalEndDate) {
        return fail(res, 400, "Both rental start date and rental end date must be provided.");
      }
      const startObj = new Date(rentalStartDate);
      const endObj = new Date(rentalEndDate);
      if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
        return fail(res, 400, "Rental start and end dates must be valid dates.");
      }
      const startIso = String(rentalStartDate).slice(0, 10);
      const endIso = String(rentalEndDate).slice(0, 10);
      const startMidnight = new Date(`${startIso}T00:00:00Z`);
      const endMidnight = new Date(`${endIso}T00:00:00Z`);
      if (isNaN(startMidnight.getTime()) || isNaN(endMidnight.getTime()) || endMidnight <= startMidnight) {
        return fail(res, 400, "Rental end date must be strictly after the start date.");
      }
      const diffDays = Math.round((endMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24));
      if (rentalDuration !== undefined && rentalDuration !== null) {
        const dur = Number(rentalDuration);
        if (!Number.isInteger(dur) || dur < 1 || dur > 30) {
          return fail(res, 400, "Rental duration must be an integer between 1 and 30 days.");
        }
        if (dur !== diffDays) {
          return fail(
            res,
            400,
            `Rental duration (${dur} days) does not match the date range (${diffDays} days).`
          );
        }
        validatedDuration = dur;
      } else {
        if (diffDays < 1 || diffDays > 30) {
          return fail(res, 400, "Rental duration must be between 1 and 30 days.");
        }
        validatedDuration = diffDays;
      }
    } else {
      const dur = rentalDuration !== undefined ? Number(rentalDuration) : 1;
      if (!Number.isInteger(dur) || dur < 1 || dur > 30) {
        return fail(res, 400, "Rental duration must be an integer between 1 and 30 days.");
      }
      validatedDuration = dur;
    }

    const dailyRate = product.rentPrice;
    finalTotal = dailyRate * validatedDuration;
    finalAdvance = 0;
    finalRemaining = 0;
    finalExpected = finalTotal; // Full authoritative rental price (no ₹50 advance)
  } else {
    // BUY / RESELL
    const supportsResell =
      ["RESELL", "BOTH"].includes(product.listingType) &&
      typeof product.price === "number" &&
      product.price > 0;
    if (!supportsResell) {
      return fail(res, 400, "This product is not available for purchase.");
    }

    parsedQty = quantity !== undefined ? Number(quantity) : 1;
    if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 50) {
      return fail(res, 400, "Quantity must be a valid integer between 1 and 50.");
    }
    if (availableStock < parsedQty) {
      return fail(
        res,
        400,
        `Requested quantity (${parsedQty}) exceeds available stock (${availableStock}) for size '${trimmedSize}'.`
      );
    }

    const sellPrice = product.price;
    finalTotal = sellPrice * parsedQty;
    finalAdvance = 0;
    finalRemaining = 0;
    finalExpected = finalTotal;
  }

  const isAdmin = Boolean(req.user && ["admin", "master"].includes(req.user.role));

  let finalCustomerId = "";
  let finalCustomerName = "";
  let finalCustomerEmail = "";
  let finalCustomerPhone = customerPhone || "";
  let finalAdminNotes = "";
  let finalRentalId = undefined;
  let finalOrderId = undefined;

  if (isAdmin) {
    finalCustomerId = req.body.customerId || (req.user ? String(req.user._id || req.user.id) : "");
    finalCustomerName = req.body.customerName || req.user?.name || "";
    finalCustomerEmail = req.body.customerEmail || req.user?.email || "";
    finalCustomerPhone = customerPhone || req.body.phone || req.user?.phone || "";
    finalAdminNotes = adminNotes ? String(adminNotes).trim() : "";
    if (rentalId) finalRentalId = String(rentalId).trim();
    if (orderId) finalOrderId = String(orderId).trim();
  } else {
    // Non-admin callers (customers or anonymous visitors)
    if (req.user) {
      finalCustomerId = String(req.user._id || req.user.id);
      finalCustomerName = req.user.name || (req.body.customerName ? String(req.body.customerName).trim() : "");
      finalCustomerEmail = req.user.email || (req.body.customerEmail ? String(req.body.customerEmail).trim() : "");
      finalCustomerPhone = customerPhone || req.user.phone || (req.body.phone ? String(req.body.phone).trim() : "");
      if (rentalId) {
        const ownedRental = await Rental.findById(rentalId);
        if (ownedRental && String(ownedRental.userId) === String(req.user._id || req.user.id)) {
          finalRentalId = String(rentalId).trim();
        }
      }
    } else {
      finalCustomerId = "";
      finalCustomerName = req.body.customerName ? String(req.body.customerName).trim() : "";
      finalCustomerEmail = req.body.customerEmail ? String(req.body.customerEmail).trim() : "";
      finalCustomerPhone = customerPhone || (req.body.phone ? String(req.body.phone).trim() : "");
    }
    finalAdminNotes = "";
  }

  // Determine initial status safely
  let initialStatus = "Awaiting Payment";
  if (status && ["Enquiry Initiated", "Awaiting Confirmation", "Awaiting Payment", "Payment Reported"].includes(status)) {
    initialStatus = status;
  }
  // Neutralize privilege escalation: disallow non-admin from creating Verified, Cancelled, or Rejected records
  if (status && ["Verified", "Cancelled", "Rejected"].includes(status)) {
    if (!isAdmin) {
      initialStatus = "Enquiry Initiated";
    } else {
      initialStatus = status;
    }
  }

  // De-duplication: check if an unverified record already exists for this reference or customer+product+size
  let existingPayment = null;
  if (customerReference) {
    existingPayment = await Payment.findOne({
      customerReference: String(customerReference).trim(),
      status: { $in: ["Enquiry Initiated", "Awaiting Confirmation", "Awaiting Payment"] }
    });
  } else if (finalCustomerId) {
    existingPayment = await Payment.findOne({
      customerId: finalCustomerId,
      productId: product.id,
      size: trimmedSize,
      transactionType: upperType,
      status: { $in: ["Enquiry Initiated", "Awaiting Confirmation", "Awaiting Payment"] }
    });
  }

  // Cross-customer security: non-admin callers cannot mutate another customer's payment record
  if (existingPayment && !isAdmin && existingPayment.customerId && existingPayment.customerId !== finalCustomerId) {
    existingPayment = null;
  }

  let genRef = customerReference
    ? String(customerReference).trim()
    : `CM-${upperType}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  if (customerReference && !isAdmin) {
    const existingWithRef = await Payment.findOne({ customerReference: String(customerReference).trim() });
    if (existingWithRef && existingWithRef.customerId && existingWithRef.customerId !== finalCustomerId) {
      genRef = `CM-${upperType}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
  }

  if (existingPayment) {
    existingPayment.expectedAmount = finalExpected;
    existingPayment.totalAmount = finalTotal;
    existingPayment.advanceAmount = finalAdvance;
    existingPayment.remainingAmount = finalRemaining;
    if (!existingPayment.customerId && finalCustomerId) {
      existingPayment.customerId = finalCustomerId;
      if (finalCustomerName) existingPayment.customerName = finalCustomerName;
      if (finalCustomerEmail) existingPayment.customerEmail = finalCustomerEmail;
    }
    if (isAdmin && adminNotes !== undefined) {
      existingPayment.adminNotes = String(adminNotes).trim();
    }
    if (status && !["Verified", "Cancelled", "Rejected"].includes(status)) {
      existingPayment.status = status;
    }
    if (rentalStartDate) existingPayment.rentalStartDate = rentalStartDate;
    if (rentalEndDate) existingPayment.rentalEndDate = rentalEndDate;
    existingPayment.rentalDuration = validatedDuration;
    existingPayment.quantity = upperType === "BUY" ? parsedQty : 1;
    await existingPayment.save();
    return ok(res, existingPayment, "Payment tracking record updated.");
  }

  const payment = new Payment({
    customerReference: genRef,
    customerId: finalCustomerId,
    customerName: finalCustomerName,
    customerEmail: finalCustomerEmail,
    customerPhone: finalCustomerPhone ? String(finalCustomerPhone).trim() : "",
    productId: product.id,
    productName: product.name,
    productImage: product.images?.[0] || "",
    transactionType: upperType,
    size: trimmedSize,
    quantity: upperType === "BUY" ? parsedQty : 1,
    ...(upperType === "RENT" && rentalStartDate ? { rentalStartDate } : {}),
    ...(upperType === "RENT" && rentalEndDate ? { rentalEndDate } : {}),
    rentalDuration: validatedDuration,
    expectedAmount: finalExpected,
    totalAmount: finalTotal,
    advanceAmount: finalAdvance,
    remainingAmount: finalRemaining,
    status: initialStatus,
    adminNotes: finalAdminNotes,
    ...(finalRentalId ? { rentalId: finalRentalId } : {}),
    ...(finalOrderId ? { orderId: finalOrderId } : {})
  });

  await payment.save();

  if (req.user) {
    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "create_payment_record",
      targetId: payment.id,
      metadata: {
        transactionType: upperType,
        expectedAmount: finalExpected,
        productName: product.name
      }
    });
  }

  return ok(res, payment, "Payment tracking record created.");
}

/**
 * Protected action: Verify Payment (Admin/Master only)
 */
export async function verifyPayment(req, res) {
  const { id } = req.params;
  const { confirmed, transactionReference, notes } = req.body;

  if (!confirmed) {
    return fail(
      res,
      400,
      "Explicit administrator confirmation is required: you must confirm having verified the actual payment in the business payment account."
    );
  }

  const payment = await Payment.findById(id);
  if (!payment) return fail(res, 404, "Payment record not found.");

  if (payment.status === "Verified") {
    return ok(res, payment, "Payment has already been verified.");
  }
  if (payment.status === "Cancelled") {
    return fail(res, 400, "Cannot verify a cancelled payment record.");
  }

  const adminName = req.user?.name || req.user?.email || "Admin";

  // If this payment is linked to a Rental (or matches an unconfirmed rental), confirm the rental advance first
  let rentalConfirmedHere = false;
  let linkedRental = null;
  let initialAdvanceStatus = null;
  let initialRentalStatus = null;

  if (payment.rentalId) {
    linkedRental = await Rental.findById(payment.rentalId);
    if (linkedRental) {
      const prodMatch = String(linkedRental.clothId) === String(payment.productId) || String(linkedRental.productId) === String(payment.productId);
      const userMatch = !payment.customerId || String(linkedRental.userId) === String(payment.customerId);
      if (!prodMatch || !userMatch) {
        linkedRental = null;
      }
    }
  }
  if (!linkedRental && payment.transactionType === "RENT" && payment.customerId && payment.productId && payment.size) {
    const andConditions = [
      { $or: [{ clothId: payment.productId }, { productId: payment.productId }] },
      { userId: payment.customerId },
      { size: { $regex: new RegExp(`^${payment.size.trim()}$`, "i") } },
      { rentalStatus: { $nin: ["CANCELLED", "COMPLETED"] } }
    ];
    if (payment.rentalStartDate) {
      andConditions.push({
        $or: [{ rentalStartDate: payment.rentalStartDate }, { pickupDate: payment.rentalStartDate }]
      });
    }
    if (payment.rentalEndDate) {
      andConditions.push({
        $or: [
          { currentEndDate: payment.rentalEndDate },
          { rentalEndDate: payment.rentalEndDate },
          { returnDate: payment.rentalEndDate },
          { originalEndDate: payment.rentalEndDate }
        ]
      });
    }
    linkedRental = await Rental.findOne({ $and: andConditions }).sort({ createdAt: -1 });

    if (linkedRental) {
      payment.rentalId = String(linkedRental._id);
      await Payment.updateOne({ _id: payment._id }, { $set: { rentalId: String(linkedRental._id) } });
    }
  }

  if (linkedRental && !["CONFIRMED", "PAYMENT_DONE", "RENT_INITIATED", "RENT_PERIOD", "RENT_RECEIVED"].includes(linkedRental.rentalStatus)) {
    initialAdvanceStatus = linkedRental.advanceStatus;
    initialRentalStatus = linkedRental.rentalStatus;

    // Ensure dates and IDs are populated from payment if missing in linkedRental
    if (!linkedRental.rentalStartDate && payment.rentalStartDate) linkedRental.rentalStartDate = payment.rentalStartDate;
    if (!linkedRental.pickupDate && payment.rentalStartDate) linkedRental.pickupDate = payment.rentalStartDate;
    if (!linkedRental.currentEndDate && payment.rentalEndDate) linkedRental.currentEndDate = payment.rentalEndDate;
    if (!linkedRental.rentalEndDate && payment.rentalEndDate) linkedRental.rentalEndDate = payment.rentalEndDate;
    if (!linkedRental.returnDate && payment.rentalEndDate) linkedRental.returnDate = payment.rentalEndDate;
    if (!linkedRental.clothId && payment.productId) linkedRental.clothId = payment.productId;
    if (!linkedRental.productId && payment.productId) linkedRental.productId = payment.productId;
    if (!linkedRental.size && payment.size) linkedRental.size = payment.size;

    try {
      await reserveRentalSlot(linkedRental);
      linkedRental.advanceStatus = "ADVANCE_RECEIVED";
      linkedRental.remainingAmount = 0;
      linkedRental.remainingPaymentStatus = "REMAINING_RECEIVED";
      linkedRental.rentalStatus = "CONFIRMED";
      await linkedRental.save();
      rentalConfirmedHere = true;
    } catch (err) {
      return fail(res, 400, `Verification failed: ${err.message}`);
    }
  }

  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: id, status: { $nin: ["Verified", "Cancelled"] } },
    {
      $set: {
        status: "Verified",
        verifiedBy: adminName,
        verifiedAt: new Date(),
        rejectionReason: "",
        ...(transactionReference ? { transactionReference: String(transactionReference).trim() } : {}),
        ...(notes ? { adminNotes: payment.adminNotes ? `${payment.adminNotes} | ${notes}` : String(notes) } : {})
      }
    },
    { new: true }
  );

  if (!updatedPayment) {
    // If the payment status update failed (conflict, cancelled, or rejected concurrently),
    // conditionally rollback ONLY the state that this specific operation set
    let compError = null;
    if (rentalConfirmedHere && linkedRental) {
      try {
        const revertedRental = await Rental.findOneAndUpdate(
          {
            _id: linkedRental._id,
            advanceStatus: "ADVANCE_RECEIVED",
            rentalStatus: "CONFIRMED"
          },
          {
            $set: {
              advanceStatus: initialAdvanceStatus,
              rentalStatus: initialRentalStatus
            }
          },
          { new: true }
        );

        if (revertedRental) {
          const releaseRes = await releaseRentalSlot(
            linkedRental.clothId || payment.productId,
            linkedRental.id
          );
          if (!releaseRes.success && releaseRes.reason !== "missing_ids") {
            compError = `Reservation release warning: ${releaseRes.reason || "failed to release slot"}`;
            console.error(compError);
          }
        }
      } catch (err) {
        compError = `Compensation error: ${err.message}`;
        console.error(compError, err);
      }
    }

    const recheck = await Payment.findById(id);
    if (recheck?.status === "Verified") {
      return ok(res, recheck, "Payment has already been verified.");
    }
    return fail(
      res,
      400,
      `Payment record cannot be verified (invalid state or cancelled).${compError ? ` (${compError})` : ""}`
    );
  }

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "payment_verified_manually",
    targetId: updatedPayment.id,
    targetType: "payment",
    metadata: {
      amount: updatedPayment.expectedAmount,
      transactionType: updatedPayment.transactionType,
      transactionReference: updatedPayment.transactionReference,
      verifiedBy: adminName
    }
  });

  return ok(res, updatedPayment, "Payment verified successfully by administrator.");
}

/**
 * Protected action: Reject Payment (Admin/Master only)
 */
export async function rejectPayment(req, res) {
  const { id } = req.params;
  const { rejectionReason, notes } = req.body;

  if (!rejectionReason || !String(rejectionReason).trim()) {
    return fail(res, 400, "A valid rejection reason is required.");
  }

  const payment = await Payment.findById(id);
  if (!payment) return fail(res, 404, "Payment record not found.");

  if (payment.status === "Verified") {
    return fail(res, 400, "Cannot reject a payment that has already been verified.");
  }
  if (payment.status === "Cancelled") {
    return fail(res, 400, "Cannot reject a payment that has already been cancelled.");
  }
  if (payment.status === "Rejected") {
    return ok(res, payment, "Payment has already been rejected.");
  }

  const adminName = req.user?.name || req.user?.email || "Admin";

  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: id, status: { $nin: ["Verified", "Cancelled", "Rejected"] } },
    {
      $set: {
        status: "Rejected",
        rejectionReason: String(rejectionReason).trim(),
        ...(notes ? { adminNotes: payment.adminNotes ? `${payment.adminNotes} | ${notes}` : String(notes) } : {})
      }
    },
    { new: true }
  );

  if (!updatedPayment) {
    const recheck = await Payment.findById(id);
    if (recheck?.status === "Verified") {
      return fail(res, 400, "Cannot reject a payment that has already been verified.");
    }
    if (recheck?.status === "Cancelled") {
      return fail(res, 400, "Cannot reject a payment that has already been cancelled.");
    }
    if (recheck?.status === "Rejected") {
      return ok(res, recheck, "Payment has already been rejected.");
    }
    return fail(res, 400, "Payment could not be rejected in its current state.");
  }

  // Ensure rejection does not release inventory belonging to a still-confirmed rental
  if (payment.rentalId) {
    const linkedRental = await Rental.findById(payment.rentalId);
    if (linkedRental) {
      const isOperational = [
        "CONFIRMED",
        "READY_FOR_HANDOVER",
        "HANDOVER_INSPECTION",
        "ACTIVE_RENTAL",
        "EXTENSION_REQUESTED",
        "EXTENDED",
        "RETURN_INSPECTION",
        "DAMAGE_REPORTED",
        "DAMAGE_SETTLEMENT"
      ].includes(linkedRental.rentalStatus);
      if (!isOperational) {
        const releaseRes = await releaseRentalSlot(linkedRental.clothId || payment.productId, linkedRental.id);
        if (!releaseRes.success && releaseRes.reason !== "missing_ids") {
          console.error(`Reservation release failed during payment rejection: ${releaseRes.reason || "unknown error"}`);
        }
      }
    }
  }

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "payment_rejected_manually",
    targetId: updatedPayment.id,
    targetType: "payment",
    metadata: {
      reason: updatedPayment.rejectionReason,
      adminName
    }
  });

  return ok(res, updatedPayment, "Payment marked as rejected.");
}

/**
 * Protected action: Cancel Payment (Admin/Master only)
 */
export async function cancelPayment(req, res) {
  const { id } = req.params;
  const payment = await Payment.findById(id);
  if (!payment) return fail(res, 404, "Payment record not found.");

  if (payment.status === "Verified") {
    return fail(res, 400, "Cannot cancel a payment that has already been verified.");
  }
  if (payment.status === "Rejected") {
    return fail(res, 400, "Cannot cancel a payment that has already been rejected.");
  }
  if (payment.status === "Cancelled") {
    return ok(res, payment, "Payment has already been cancelled.");
  }

  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: id, status: { $nin: ["Verified", "Cancelled", "Rejected"] } },
    { $set: { status: "Cancelled" } },
    { new: true }
  );

  if (!updatedPayment) {
    const recheck = await Payment.findById(id);
    if (recheck?.status === "Verified") {
      return fail(res, 400, "Cannot cancel a payment that has already been verified.");
    }
    if (recheck?.status === "Rejected") {
      return fail(res, 400, "Cannot cancel a payment that has already been rejected.");
    }
    if (recheck?.status === "Cancelled") {
      return ok(res, recheck, "Payment has already been cancelled.");
    }
    return fail(res, 400, "Payment could not be cancelled in its current state.");
  }

  // Ensure cancellation does not release inventory belonging to a still-confirmed rental
  if (payment.rentalId) {
    const linkedRental = await Rental.findById(payment.rentalId);
    if (linkedRental) {
      const isOperational = [
        "CONFIRMED",
        "READY_FOR_HANDOVER",
        "HANDOVER_INSPECTION",
        "ACTIVE_RENTAL",
        "EXTENSION_REQUESTED",
        "EXTENDED",
        "RETURN_INSPECTION",
        "DAMAGE_REPORTED",
        "DAMAGE_SETTLEMENT"
      ].includes(linkedRental.rentalStatus);
      if (!isOperational) {
        const releaseRes = await releaseRentalSlot(linkedRental.clothId || payment.productId, linkedRental.id);
        if (!releaseRes.success && releaseRes.reason !== "missing_ids") {
          console.error(`Reservation release failed during payment cancellation: ${releaseRes.reason || "unknown error"}`);
        }
      }
    }
  }

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "payment_cancelled",
    targetId: updatedPayment.id,
    targetType: "payment"
  });

  return ok(res, updatedPayment, "Payment cancelled.");
}

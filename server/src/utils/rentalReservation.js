import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";

export const OPERATIONAL_RENTAL_STATUSES = [
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
 * Reconciles historical legacy rentals that do not yet have an activeRentals entry on the Product document.
 * Prevents double-counting and ensures atomic reservation isolation covers both legacy and new bookings.
 * 
 * @param {Object} product - Mongoose Product document
 */
export async function reconcileLegacyRentals(product) {
  if (!product || !product._id) return;
  const productIdStr = String(product._id);

  // Find operational rentals for this product in the Rental collection
  const operationalRentals = await Rental.find({
    $or: [{ clothId: productIdStr }, { productId: productIdStr }],
    rentalStatus: { $in: OPERATIONAL_RENTAL_STATUSES }
  });

  if (!operationalRentals || operationalRentals.length === 0) return;

  const currentReservations = product.activeRentals || [];
  const reservedRentalIdSet = new Set(currentReservations.map((r) => String(r.rentalId)));

  // Identify operational rentals missing from product.activeRentals
  const unrepresented = operationalRentals.filter(
    (rental) => !reservedRentalIdSet.has(String(rental._id))
  );

  if (unrepresented.length === 0) return;

  // Reconcile each unrepresented legacy rental onto the Product document
  for (const legacyRental of unrepresented) {
    const legacyIdStr = String(legacyRental._id);
    const size = legacyRental.size;
    const startDate = legacyRental.rentalStartDate || legacyRental.pickupDate;
    const endDate = legacyRental.currentEndDate || legacyRental.rentalEndDate || legacyRental.returnDate;

    if (!size || !startDate || !endDate) continue;

    const variant = product.sizeVariants?.find((v) => v.size === size);
    const sizeStock = variant ? variant.stock : product.stock || 1;

    // Atomically find an available unit slot (1 through sizeStock)
    for (let unit = 1; unit <= sizeStock; unit++) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: product._id,
          "activeRentals.rentalId": { $ne: legacyIdStr },
          activeRentals: {
            $not: {
              $elemMatch: {
                size,
                unitIndex: unit,
                startDate: { $lte: endDate },
                endDate: { $gte: startDate }
              }
            }
          }
        },
        {
          $push: {
            activeRentals: {
              rentalId: legacyIdStr,
              size,
              unitIndex: unit,
              startDate,
              endDate
            }
          }
        },
        { new: true }
      );

      if (updated) {
        product.activeRentals = updated.activeRentals;
        break;
      }
    }
  }
}

/**
 * Atomically reserves a unit slot on the Product document for a given Rental.
 * Guarantees that confirmed overlapping rentals for a given size never exceed available stock.
 * Concurrency-safe against race conditions via atomic MongoDB findOneAndUpdate.
 * 
 * @param {Object} rental - Mongoose Rental document or plain object with rental details
 * @returns {Promise<{ success: boolean, unitIndex: number, alreadyReserved?: boolean }>}
 */
export async function reserveRentalSlot(firstArg, secondArg) {
  const rental = (secondArg && (secondArg.clothId || secondArg.rentalStartDate || secondArg.pickupDate)) ? secondArg : firstArg;
  const clothId = rental.clothId || rental.productId || (firstArg?._id && secondArg ? firstArg._id : null);
  const product = await Product.findById(clothId);
  if (!product || product.available === false) {
    throw new Error("This cloth product is no longer active in the catalog.");
  }

  const variant = product.sizeVariants?.find((v) => v.size === rental.size);
  const sizeStock = variant ? variant.stock : product.stock || 1;
  if (sizeStock <= 0) {
    throw new Error(`Size '${rental.size}' is currently out of stock.`);
  }

  const pickupDate = rental.rentalStartDate || rental.pickupDate;
  const returnDate = rental.currentEndDate || rental.rentalEndDate || rental.returnDate;

  if (!pickupDate || !returnDate) {
    throw new Error("Rental start date and return date are required.");
  }

  const rentalIdStr = String(rental._id || rental.id);

  // Reconcile legacy operational rentals so activeRentals is fully authoritative
  await reconcileLegacyRentals(product);

  // Reload product to inspect latest activeRentals state
  const freshProduct = await Product.findById(clothId);
  const activeRentals = freshProduct?.activeRentals || [];

  // Idempotency check:
  const existingReservation = activeRentals.find(
    (r) => String(r.rentalId) === rentalIdStr
  );

  if (existingReservation) {
    // If exact match on size, startDate, and endDate:
    if (
      existingReservation.size === rental.size &&
      existingReservation.startDate === pickupDate &&
      existingReservation.endDate === returnDate
    ) {
      return { success: true, alreadyReserved: true, unitIndex: existingReservation.unitIndex };
    }

    // Dates or size changed (e.g. extension approval)
    if (existingReservation.endDate !== returnDate || existingReservation.startDate !== pickupDate) {
      return await extendRentalSlot(rental, returnDate);
    }
  }

  // ATOMIC RESERVATION LOOP:
  // Try assigning each available physical unit index (1 through sizeStock).
  let assignedUnit = null;
  for (let unit = 1; unit <= sizeStock; unit++) {
    const updated = await Product.findOneAndUpdate(
      {
        _id: product._id,
        available: true,
        "activeRentals.rentalId": { $ne: rentalIdStr },
        activeRentals: {
          $not: {
            $elemMatch: {
              size: rental.size,
              unitIndex: unit,
              startDate: { $lte: returnDate },
              endDate: { $gte: pickupDate }
            }
          }
        }
      },
      {
        $push: {
          activeRentals: {
            rentalId: rentalIdStr,
            size: rental.size,
            unitIndex: unit,
            startDate: pickupDate,
            endDate: returnDate
          }
        }
      },
      { new: true }
    );

    if (updated) {
      assignedUnit = unit;
      break;
    }
  }

  if (!assignedUnit) {
    // Check if the rental was reserved concurrently in another turn
    const recheck = await Product.findById(product._id);
    const existing = recheck?.activeRentals?.find((r) => String(r.rentalId) === rentalIdStr);
    if (existing) {
      return { success: true, alreadyReserved: true, unitIndex: existing.unitIndex };
    }

    throw new Error(
      `Cloth '${product.name}' (Size: ${rental.size}) is already fully booked by confirmed rentals between ${pickupDate} and ${returnDate}.`
    );
  }

  return { success: true, unitIndex: assignedUnit };
}

/**
 * Safely extends a rental's reservation on the Product document to a new requested end date.
 * Revalidates availability, preserves assigned unit if free, remaps to another free unit if available,
 * and preserves original reservation completely if the extension cannot be approved.
 * 
 * @param {Object} rental - Mongoose Rental document or object
 * @param {string} requestedEndDate - New proposed end date (YYYY-MM-DD)
 * @returns {Promise<{ success: boolean, unitIndex: number, alreadyExtended?: boolean, reassigned?: boolean }>}
 */
export async function extendRentalSlot(rental, requestedEndDate) {
  const clothId = rental.clothId || rental.productId;
  const product = await Product.findById(clothId);
  if (!product || product.available === false) {
    throw new Error("This cloth product is no longer active in the catalog.");
  }

  const variant = product.sizeVariants?.find((v) => v.size === rental.size);
  const sizeStock = variant ? variant.stock : product.stock || 1;
  if (sizeStock <= 0) {
    throw new Error(`Size '${rental.size}' is currently out of stock.`);
  }

  const rentalIdStr = String(rental._id || rental.id);
  const pickupDate = rental.rentalStartDate || rental.pickupDate;
  const currentEndDate = rental.currentEndDate || rental.rentalEndDate || rental.returnDate;

  if (!requestedEndDate || new Date(requestedEndDate) <= new Date(pickupDate)) {
    throw new Error("Extended return date must be after rental start date.");
  }

  // Ensure legacy operational rentals are reconciled
  await reconcileLegacyRentals(product);

  const freshProduct = await Product.findById(clothId);
  const existingReservation = freshProduct?.activeRentals?.find(
    (r) => String(r.rentalId) === rentalIdStr
  );

  // Idempotency: already extended to requestedEndDate
  if (existingReservation && existingReservation.endDate === requestedEndDate) {
    return { success: true, alreadyExtended: true, unitIndex: existingReservation.unitIndex };
  }

  // Case 1: Existing reservation exists -> attempt to extend on the SAME unitIndex
  if (existingReservation) {
    const assignedUnit = existingReservation.unitIndex;
    const updatedSameUnit = await Product.findOneAndUpdate(
      {
        _id: product._id,
        available: true,
        activeRentals: {
          $elemMatch: {
            rentalId: rentalIdStr,
            unitIndex: assignedUnit
          },
          $not: {
            $elemMatch: {
              rentalId: { $ne: rentalIdStr },
              size: rental.size,
              unitIndex: assignedUnit,
              startDate: { $lte: requestedEndDate },
              endDate: { $gte: existingReservation.endDate }
            }
          }
        }
      },
      {
        $set: {
          "activeRentals.$[elem].endDate": requestedEndDate
        }
      },
      {
        arrayFilters: [{ "elem.rentalId": rentalIdStr }],
        new: true
      }
    );

    if (updatedSameUnit) {
      return { success: true, unitIndex: assignedUnit, extendedSameUnit: true };
    }

    // Same unit is conflicted by an upcoming booking. Try reassigning to another unit that is free for the entire duration
    for (let unit = 1; unit <= sizeStock; unit++) {
      if (unit === assignedUnit) continue;

      const remapped = await Product.findOneAndUpdate(
        {
          _id: product._id,
          available: true,
          activeRentals: {
            $elemMatch: {
              rentalId: rentalIdStr
            },
            $not: {
              $elemMatch: {
                rentalId: { $ne: rentalIdStr },
                size: rental.size,
                unitIndex: unit,
                startDate: { $lte: requestedEndDate },
                endDate: { $gte: pickupDate }
              }
            }
          }
        },
        {
          $set: {
            "activeRentals.$[elem].unitIndex": unit,
            "activeRentals.$[elem].endDate": requestedEndDate
          }
        },
        {
          arrayFilters: [{ "elem.rentalId": rentalIdStr }],
          new: true
        }
      );

      if (remapped) {
        return { success: true, unitIndex: unit, reassigned: true };
      }
    }

    // If no unit can accommodate the extension, original reservation on assignedUnit remains untouched!
    throw new Error(
      `Cloth '${product.name}' (Size: ${rental.size}) cannot be extended to ${requestedEndDate}: fully booked by other confirmed rentals for the extended period.`
    );
  }

  // Case 2: Legacy rental without an activeRentals entry yet
  let legacyAssignedUnit = null;
  for (let unit = 1; unit <= sizeStock; unit++) {
    const assigned = await Product.findOneAndUpdate(
      {
        _id: product._id,
        available: true,
        "activeRentals.rentalId": { $ne: rentalIdStr },
        activeRentals: {
          $not: {
            $elemMatch: {
              size: rental.size,
              unitIndex: unit,
              startDate: { $lte: requestedEndDate },
              endDate: { $gte: pickupDate }
            }
          }
        }
      },
      {
        $push: {
          activeRentals: {
            rentalId: rentalIdStr,
            size: rental.size,
            unitIndex: unit,
            startDate: pickupDate,
            endDate: requestedEndDate
          }
        }
      },
      { new: true }
    );

    if (assigned) {
      legacyAssignedUnit = unit;
      break;
    }
  }

  if (!legacyAssignedUnit) {
    throw new Error(
      `Cloth '${product.name}' (Size: ${rental.size}) cannot be extended to ${requestedEndDate}: fully booked by other confirmed rentals.`
    );
  }

  return { success: true, unitIndex: legacyAssignedUnit, legacyCreated: true };
}

/**
 * Releases a reserved rental slot on the Product (on cancellation, rejection, or completion).
 * Does not silently swallow database errors; returns explicit status for caller verification.
 * 
 * @param {string} clothId - Product ID
 * @param {string} rentalId - Rental ID
 * @returns {Promise<{ success: boolean, released: boolean, modifiedCount?: number, reason?: string }>}
 */
export async function releaseRentalSlot(clothId, rentalId) {
  if (!clothId || !rentalId) {
    return { success: false, released: false, reason: "missing_ids" };
  }

  const result = await Product.updateOne(
    { _id: clothId, "activeRentals.rentalId": String(rentalId) },
    { $pull: { activeRentals: { rentalId: String(rentalId) } } }
  );

  return {
    success: true,
    released: result.modifiedCount > 0,
    modifiedCount: result.modifiedCount
  };
}

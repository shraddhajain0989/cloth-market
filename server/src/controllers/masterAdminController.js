import bcrypt from "bcryptjs";
import { AuditLog, logAction } from "../models/AuditLog.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";
import { fail, ok } from "../utils/respond.js";

/**
 * Platform-wide analytics for Master Admin
 */
export async function getMasterAnalytics(_req, res) {
  const [
    totalUsers,
    totalAdmins,
    totalProducts,
    inventoryAgg,
    totalRentals,
    activeRentals,
    completedRentals,
    cancelledRentals,
    extensionRequests,
    rentalFinancialsAgg,
    damageAgg,
    recentLogs
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "admin" }),
    Product.countDocuments(),
    Product.aggregate([{ $group: { _id: null, totalStock: { $sum: "$stock" } } }]),
    Rental.countDocuments(),
    Rental.countDocuments({ rentalStatus: "ACTIVE_RENTAL" }),
    Rental.countDocuments({ rentalStatus: "COMPLETED" }),
    Rental.countDocuments({ rentalStatus: "CANCELLED" }),
    Rental.countDocuments({ rentalStatus: "EXTENSION_REQUESTED" }),
    Rental.aggregate([
      {
        $group: {
          _id: null,
          totalRentalValue: { $sum: "$rentalAmount" },
          advanceCollected: {
            $sum: {
              $cond: [{ $eq: ["$advanceStatus", "ADVANCE_RECEIVED"] }, "$advanceAmount", 0]
            }
          },
          outstandingRemaining: {
            $sum: {
              $cond: [{ $eq: ["$remainingPaymentStatus", "REMAINING_PENDING"] }, "$remainingAmount", 0]
            }
          }
        }
      }
    ]),
    Rental.aggregate([
      { $match: { "damageReport.damageDetected": true } },
      { $group: { _id: null, totalDamage: { $sum: "$damageReport.amount" } } }
    ]),
    AuditLog.find().sort({ createdAt: -1 }).limit(10)
  ]);

  const availableInventory = inventoryAgg[0]?.totalStock || 0;
  const financials = rentalFinancialsAgg[0] || { totalRentalValue: 0, advanceCollected: 0, outstandingRemaining: 0 };
  const totalDamage = damageAgg[0]?.totalDamage || 0;

  return ok(
    res,
    {
      kpis: {
        totalUsers,
        totalAdmins,
        totalClothes: totalProducts,
        availableInventory,
        totalRentals,
        activeRentals,
        completedRentals,
        cancelledRentals,
        extensionRequests,
        totalRentalValue: financials.totalRentalValue,
        advanceCollected: financials.advanceCollected,
        outstandingRemaining: financials.outstandingRemaining,
        totalDamageCharges: totalDamage
      },
      recentLogs
    },
    "Master Admin analytics fetched."
  );
}

/**
 * List all admin accounts
 */
export async function listAdmins(_req, res) {
  const admins = await User.find({ role: "admin" }).select("-password -refreshTokens");
  return ok(res, admins, "Admin accounts fetched.");
}

/**
 * Create a new Admin account
 */
export async function createAdmin(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return fail(res, 400, "Name, email, and password are required.");
  }

  if (password.length < 6) {
    return fail(res, 400, "Password must be at least 6 characters.");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return fail(res, 409, "An account with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminUser = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: "admin",
    status: "active",
    verified: true
  });

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "master_created_admin",
    targetId: adminUser.id,
    metadata: { name, email }
  });

  return ok(
    res,
    { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role, status: adminUser.status },
    "Admin account created successfully."
  );
}

/**
 * Activate or Disable an Admin account
 */
export async function setAdminStatus(req, res) {
  const { status } = req.body; // "active" or "disabled"
  if (!["active", "disabled"].includes(status)) {
    return fail(res, 400, "Status must be 'active' or 'disabled'.");
  }

  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, "User not found.");

  if (user.role === "master") {
    return fail(res, 403, "Cannot change status of Master Admin.");
  }

  user.status = status;
  await user.save();

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: `master_${status}_admin`,
    targetId: user.id,
    metadata: { status, email: user.email }
  });

  return ok(res, { id: user.id, status: user.status }, `Admin status updated to ${status}.`);
}

/**
 * Delete an Admin account
 */
export async function deleteAdmin(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, "User not found.");

  if (user.role === "master") {
    return fail(res, 403, "Cannot delete Master Admin.");
  }

  await User.findByIdAndDelete(req.params.id);

  await logAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "master_deleted_admin",
    targetId: req.params.id,
    metadata: { email: user.email }
  });

  return ok(res, null, "Admin account deleted successfully.");
}

/**
 * View audit logs
 */
export async function getAuditLogs(_req, res) {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(50);
  return ok(res, logs, "Audit logs fetched.");
}

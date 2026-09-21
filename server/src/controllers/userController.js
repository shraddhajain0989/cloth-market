import { Order } from "../models/Order.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";
import { fail, ok } from "../utils/respond.js";

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  const { password, refreshTokens, resetPasswordToken, resetPasswordExpiry, __v, ...safe } = obj;
  return safe;
}

export async function getProfile(req, res) {
  const user = await User.findById(req.user._id);
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  const rentals = await Rental.find({ userId: req.user.id }).sort({ createdAt: -1 });
  return ok(res, { ...sanitizeUser(user), orders, rentals }, "Profile fetched.");
}

export async function updateProfile(req, res) {
  const { password, role, refreshTokens, ...allowedUpdates } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, allowedUpdates, { new: true });
  return ok(res, sanitizeUser(user), "Profile updated.");
}

export async function addAddress(req, res) {
  const user = await User.findById(req.user._id);
  user.addresses.push(req.body);
  await user.save();
  return ok(res, user.addresses, "Address saved.");
}

export async function updateWishlist(req, res) {
  const { productId } = req.body;
  const user = await User.findById(req.user._id);
  const alreadyWishlisted = user.wishlist.includes(productId);

  const update = alreadyWishlisted
    ? { $pull: { wishlist: productId } }
    : { $push: { wishlist: productId } };

  const updated = await User.findByIdAndUpdate(req.user._id, update, { new: true });
  return ok(res, updated.wishlist, "Wishlist updated.");
}

export async function getUsers(_req, res) {
  const users = await User.find().select("-password -refreshTokens -resetPasswordToken -resetPasswordExpiry");
  return ok(res, users, "Users fetched.");
}

export async function deleteUser(req, res) {
  const user = await User.findById(req.params.userId);
  if (!user) return fail(res, 404, "User not found.");
  if (user.role === "master") return fail(res, 403, "Master accounts cannot be removed.");
  await User.findByIdAndDelete(req.params.userId);
  return ok(res, null, "User deleted.");
}

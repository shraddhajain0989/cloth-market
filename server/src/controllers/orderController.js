import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { sendOrderConfirmationEmail } from "../services/emailService.js";
import { fail, ok } from "../utils/respond.js";

export async function getCart(req, res) {
  const user = await User.findById(req.user._id).select("cart");
  return ok(res, user?.cart || [], "Cart fetched.");
}

export async function addToCart(req, res) {
  const { productId, quantity = 1 } = req.body;
  const qty = Math.max(1, Number(quantity || 1));

  const product = await Product.findById(productId);
  if (!product || !product.available) {
    return fail(res, 404, "Product is currently unavailable.");
  }

  if (product.stock < qty) {
    return fail(res, 400, `Only ${product.stock} unit(s) available in stock.`);
  }

  const user = await User.findById(req.user._id);
  const existing = user.cart.find((item) => item.productId === String(productId));

  if (existing) {
    const newQty = existing.quantity + qty;
    if (newQty > product.stock) {
      return fail(res, 400, `Cannot add more. Only ${product.stock} unit(s) in stock.`);
    }
    existing.quantity = newQty;
    existing.price = product.flashSalePrice || product.price;
    existing.name = product.name;
    existing.image = product.images?.[0] || "";
  } else {
    user.cart.push({
      productId: product.id,
      name: product.name,
      price: product.flashSalePrice || product.price,
      image: product.images?.[0] || "",
      quantity: qty
    });
  }

  await user.save();
  return ok(res, user.cart, "Item added to cart.");
}

export async function updateCartItem(req, res) {
  const { productId } = req.params;
  const qty = Math.max(1, Number(req.body.quantity || 1));

  const product = await Product.findById(productId);
  if (product && qty > product.stock) {
    return fail(res, 400, `Only ${product.stock} unit(s) available in stock.`);
  }

  const user = await User.findById(req.user._id);
  const item = user.cart.find((entry) => entry.productId === String(productId));
  if (!item) return fail(res, 404, "Cart item not found.");

  item.quantity = qty;
  if (product) {
    item.price = product.flashSalePrice || product.price;
  }
  await user.save();
  return ok(res, user.cart, "Cart updated.");
}

export async function removeCartItem(req, res) {
  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter((entry) => entry.productId !== String(req.params.productId));
  await user.save();
  return ok(res, user.cart, "Item removed from cart.");
}

export async function placeOrder(req, res) {
  const user = await User.findById(req.user._id);
  if (!user || !user.cart || user.cart.length === 0) {
    return fail(res, 400, "Your cart is empty.");
  }

  // SERVER-SIDE PRICE TRUTH & STOCK VALIDATION
  const productIds = user.cart.map((item) => item.productId);
  const dbProducts = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  const verifiedItems = [];
  let subtotal = 0;

  for (const item of user.cart) {
    const dbProduct = productMap.get(item.productId);
    if (!dbProduct || !dbProduct.available) {
      return fail(res, 400, `Product '${item.name}' is no longer available.`);
    }

    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return fail(res, 400, `Invalid quantity for product '${dbProduct.name}'.`);
    }

    if (dbProduct.stock < item.quantity) {
      return fail(
        res,
        400,
        `Insufficient stock for '${dbProduct.name}'. Available: ${dbProduct.stock}, Requested: ${item.quantity}`
      );
    }

    const actualPrice = dbProduct.flashSalePrice || dbProduct.price;
    const itemSubtotal = actualPrice * item.quantity;
    subtotal += itemSubtotal;

    verifiedItems.push({
      productId: dbProduct.id,
      name: dbProduct.name,
      price: actualPrice,
      image: dbProduct.images?.[0] || item.image || "",
      quantity: item.quantity
    });
  }

  // Coupon Validation
  let coupon = null;
  let discount = 0;

  if (req.body.couponCode) {
    const cleanCode = String(req.body.couponCode).toUpperCase().trim();
    coupon = await Coupon.findOne({ code: cleanCode, active: true });
    if (!coupon) {
      return fail(res, 400, "Invalid or expired coupon code.");
    }
    if (subtotal < coupon.minOrderValue) {
      return fail(
        res,
        400,
        `Coupon ${coupon.code} requires a minimum order value of ₹${coupon.minOrderValue}.`
      );
    }

    if (coupon.type === "percent") {
      const pct = Math.min(Math.max(0, coupon.value), 100);
      discount = Math.round((subtotal * pct) / 100);
    } else {
      discount = Math.min(subtotal, Math.max(0, coupon.value || 0));
    }
  }

  const tax = Math.round(subtotal * 0.08);
  const deliveryFee = subtotal > 1499 ? 0 : 99;
  const total = Math.max(0, subtotal + tax + deliveryFee - discount);

  // Validate Shipping Address
  const shippingAddress = req.body.shippingAddress || (user.addresses && user.addresses[0]);
  if (!shippingAddress || !shippingAddress.line1 || !shippingAddress.city) {
    return fail(res, 400, "Please provide a valid shipping address.");
  }

  // ATOMIC CONDITIONAL STOCK DECREMENT (RACE-CONDITION PROOF)
  const decrementedItems = [];
  for (const item of verifiedItems) {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );

    if (!updatedProduct) {
      // Rollback stock for previously decremented items in this transaction
      for (const dec of decrementedItems) {
        await Product.findByIdAndUpdate(dec.productId, { $inc: { stock: dec.quantity } });
      }
      return fail(
        res,
        400,
        `Insufficient stock for '${item.name}' due to high demand. Please try again.`
      );
    }

    decrementedItems.push(item);
  }

  // Create Order
  const order = await Order.create({
    userId: user.id,
    items: verifiedItems,
    couponCode: coupon?.code,
    subtotal,
    tax,
    deliveryFee,
    discount,
    total,
    status: "Processing",
    paymentMethod: req.body.paymentMethod || "cod",
    paymentProviderStatus: "pending",
    trackingStatus: "Order placed",
    shippingAddress
  });

  // Clear user cart
  user.cart = [];
  await user.save();

  // Send email notification non-blocking
  sendOrderConfirmationEmail(user.email, user.name, order).catch((err) =>
    console.error("Order confirmation email error:", err.message)
  );

  return ok(res, order, "Order placed successfully.");
}

export async function listOrders(req, res) {
  const isAdmin = req.user.role === "admin" || req.user.role === "master";
  const query = isAdmin ? {} : { userId: req.user.id };
  const orders = await Order.find(query).sort({ createdAt: -1 });
  return ok(res, orders, "Orders fetched.");
}

export async function createReturnRequest(req, res) {
  const { orderId, reason } = req.body;
  if (!orderId || !reason) return fail(res, 400, "Order ID and return reason are required.");

  const order = await Order.findOne({ _id: orderId, userId: req.user.id });
  if (!order) return fail(res, 404, "Order not found or authorization denied.");

  const { Return } = await import("../models/Return.js");
  const entry = await Return.create({
    orderId: order.id,
    userId: req.user.id,
    reason: String(reason).trim(),
    status: "Requested"
  });

  return ok(res, entry, "Return request submitted successfully.");
}

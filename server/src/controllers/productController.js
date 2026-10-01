import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { Rental } from "../models/Rental.js";
import { logAction } from "../models/AuditLog.js";
import { ok, fail } from "../utils/respond.js";
import { OPERATIONAL_RENTAL_STATUSES } from "./adminController.js";

export async function listProducts(req, res) {
  const { search = "", category = "", sort = "featured" } = req.query;

  const query = {};
  if (req.query.includeInactive !== "true") {
    query.available = { $ne: false };
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } }
    ];
  }
  if (category) {
    query.category = { $regex: `^${category}$`, $options: "i" };
  }

  let sortOption = {};
  if (sort === "price-asc") sortOption = { price: 1 };
  else if (sort === "price-desc") sortOption = { price: -1 };
  else if (sort === "rating") sortOption = { rating: -1 };
  else sortOption = { createdAt: -1 };

  const products = await Product.find(query).sort(sortOption);
  const categories = await Product.distinct("category");

  return ok(res, { items: products, facets: { categories } }, "Products fetched.");
}

export async function getProduct(req, res) {
  const product = await Product.findById(req.params.productId);
  if (!product) return fail(res, 404, "Cloth product not found.");
  return ok(res, product, "Cloth product fetched.");
}

export async function createProduct(req, res) {
  const body = req.body;
  if (!body.name || !body.category) {
    return fail(res, 400, "Cloth name and category are required.");
  }

  // Ensure sizeVariants exist
  let sizeVariants = body.sizeVariants;
  if (!sizeVariants || sizeVariants.length === 0) {
    const rawSizes = Array.isArray(body.sizes)
      ? body.sizes
      : typeof body.sizes === "string"
      ? body.sizes.split(",").map((s) => s.trim())
      : ["S", "M", "L", "XL"];
    const perSizeStock = Math.max(1, Math.floor((body.stock || 10) / rawSizes.length));
    sizeVariants = rawSizes.map((s) => ({
      size: s,
      stock: perSizeStock,
      available: true
    }));
  }

  const images = Array.isArray(body.images) && body.images.length > 0
    ? body.images
    : ["https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop"];

  const product = new Product({
    ...body,
    images,
    sizeVariants,
    rating: body.rating || 4.8,
    reviewsCount: body.reviewsCount || 12,
    available: true
  });

  await product.save();

  if (req.user) {
    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "create_cloth_product",
      targetId: product.id,
      metadata: { name: product.name, rentPrice: product.rentPrice }
    });
  }

  return ok(res, product, "Cloth product created successfully.");
}

export async function updateProduct(req, res) {
  const product = await Product.findById(req.params.productId);
  if (!product) return fail(res, 404, "Cloth product not found.");

  const updates = req.body;
  if (updates.sizeVariants && Array.isArray(updates.sizeVariants)) {
    product.sizeVariants = updates.sizeVariants;
  } else if (updates.sizes && Array.isArray(updates.sizes)) {
    product.sizes = updates.sizes;
  }

  if (updates.name !== undefined) product.name = updates.name;
  if (updates.category !== undefined) product.category = updates.category;
  if (updates.gender !== undefined) product.gender = updates.gender;
  if (updates.description !== undefined) product.description = updates.description;
  if (updates.rentPrice !== undefined) product.rentPrice = Number(updates.rentPrice);
  if (updates.price !== undefined) product.price = Number(updates.price);
  if (updates.securityDeposit !== undefined) product.securityDeposit = Number(updates.securityDeposit);
  if (updates.images !== undefined && Array.isArray(updates.images)) product.images = updates.images;
  if (updates.available !== undefined) product.available = Boolean(updates.available);
  if (updates.stock !== undefined && (!updates.sizeVariants || updates.sizeVariants.length === 0)) {
    product.stock = Number(updates.stock);
  }

  await product.save();

  if (req.user) {
    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "update_cloth_product",
      targetId: product.id,
      metadata: { rentPrice: product.rentPrice, stock: product.stock }
    });
  }

  return ok(res, product, "Cloth product updated successfully.");
}

export async function deleteProduct(req, res) {
  const { productId } = req.params;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) return fail(res, 404, "Cloth product not found.");

  // Check for active or operational rentals
  const activeRental = await Rental.findOne({
    $and: [
      { $or: [{ clothId: productId }, { productId: productId }] },
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
    return fail(res, 400, `Cannot remove product with active or upcoming rentals (status: ${currentStatus}).`);
  }

  // Check if product has historical rentals
  const hasHistoricalRentals = await Rental.exists({
    $or: [{ clothId: productId }, { productId: productId }]
  });

  if (hasHistoricalRentals) {
    // Preserve historical rental integrity via soft removal
    product.available = false;
    product.stock = 0;
    if (Array.isArray(product.sizeVariants)) {
      product.sizeVariants.forEach((v) => {
        v.available = false;
        v.stock = 0;
      });
    }
    await product.save();
  } else {
    // No rental history ever — safe to hard delete
    await Product.findByIdAndDelete(productId);
  }

  if (req.user) {
    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "delete_cloth_product",
      targetId: productId,
      targetType: "product"
    });
  }

  return ok(res, null, "Cloth product removed successfully.");
}

export async function listCoupons(_req, res) {
  const coupons = await Coupon.find({ active: true });
  return ok(res, coupons, "Coupons fetched.");
}

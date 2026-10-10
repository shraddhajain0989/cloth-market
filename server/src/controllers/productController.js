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

  // 1. Validate listingType and pricing
  const listingType = body.listingType || "RENT";
  if (!["RENT", "RESELL", "BOTH"].includes(listingType)) {
    return fail(res, 400, "Invalid listing type. Must be RENT, RESELL, or BOTH.");
  }

  const rentPrice = Number(body.rentPrice) || 0;
  const price = Number(body.price) || 0;

  if (listingType === "RENT" && rentPrice <= 0) {
    return fail(res, 400, "Rental price per day is required for RENT listings.");
  }
  if (listingType === "RESELL" && price <= 0) {
    return fail(res, 400, "Selling price is required for RESELL listings.");
  }
  if (listingType === "BOTH" && (rentPrice <= 0 || price <= 0)) {
    return fail(res, 400, "Both rental price and selling price are required for BOTH (RENT & RESELL) listings.");
  }

  // 2. Validate images: minimum 1, maximum 5
  const rawImages = body.images;
  if (!rawImages || !Array.isArray(rawImages) || rawImages.length === 0) {
    return fail(res, 400, "Every clothing product requires at least 1 image.");
  }
  if (rawImages.length > 5) {
    return fail(res, 400, `A product cannot have more than 5 images (received ${rawImages.length}).`);
  }
  if (rawImages.some((img) => typeof img !== "string" || img.startsWith("blob:"))) {
    return fail(res, 400, "Temporary browser blob URLs cannot be saved. Please upload permanent images.");
  }

  // Validate stock values as non-negative integers if provided
  if (body.stock !== undefined) {
    const parsedStock = Number(body.stock);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return fail(res, 400, "Product stock must be a non-negative integer.");
    }
  }

  if (body.sizeVariants !== undefined && Array.isArray(body.sizeVariants)) {
    for (const v of body.sizeVariants) {
      if (!v.size || typeof v.size !== "string") {
        return fail(res, 400, "Each size variant must have a valid size.");
      }
      const vStock = Number(v.stock);
      if (!Number.isInteger(vStock) || vStock < 0) {
        return fail(res, 400, `Stock value for size '${v.size}' must be a non-negative integer.`);
      }
    }
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

  const validCondition = ["New with tags", "Like new", "Gently used"].includes(body.condition)
    ? body.condition
    : "Like new";

  const product = new Product({
    ...body,
    listingType,
    condition: validCondition,
    rentPrice,
    price,
    images: rawImages,
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
      metadata: { name: product.name, listingType: product.listingType, rentPrice: product.rentPrice, price: product.price }
    });
  }

  return ok(res, product, "Cloth product created successfully.");
}

export async function updateProduct(req, res) {
  const product = await Product.findById(req.params.productId);
  if (!product) return fail(res, 404, "Cloth product not found.");

  const updates = req.body;

  // 1. Validate images if provided
  if (updates.images !== undefined) {
    if (!Array.isArray(updates.images)) {
      return fail(res, 400, "Images must be an array.");
    }
    if (updates.images.length === 0) {
      return fail(res, 400, "Every clothing product requires at least 1 image.");
    }
    // Safe handling for historical products with > 5 images
    if (product.images && product.images.length > 5 && updates.images.length > product.images.length) {
      return fail(
        res,
        400,
        `This product has ${product.images.length} historical images. Cannot add more until reduced to 5 or fewer.`
      );
    }
    if (updates.images.length > 5 && (!product.images || product.images.length <= 5)) {
      return fail(res, 400, `A product cannot have more than 5 images (received ${updates.images.length}).`);
    }
    if (updates.images.some((img) => typeof img !== "string" || img.startsWith("blob:"))) {
      return fail(res, 400, "Temporary browser blob URLs cannot be saved. Please upload permanent images.");
    }
    product.images = updates.images;
  }

  // 2. Validate listingType and pricing
  const newListingType = updates.listingType !== undefined ? updates.listingType : product.listingType || "RENT";
  if (!["RENT", "RESELL", "BOTH"].includes(newListingType)) {
    return fail(res, 400, "Invalid listing type. Must be RENT, RESELL, or BOTH.");
  }
  product.listingType = newListingType;

  const newRentPrice = updates.rentPrice !== undefined ? Number(updates.rentPrice) : product.rentPrice || 0;
  const newPrice = updates.price !== undefined ? Number(updates.price) : product.price || 0;

  if (newListingType === "RENT" && newRentPrice <= 0) {
    return fail(res, 400, "Rental price per day is required for RENT listings.");
  }
  if (newListingType === "RESELL" && newPrice <= 0) {
    return fail(res, 400, "Selling price is required for RESELL listings.");
  }
  if (newListingType === "BOTH" && (newRentPrice <= 0 || newPrice <= 0)) {
    return fail(res, 400, "Both rental price and selling price are required for BOTH (RENT & RESELL) listings.");
  }

  product.rentPrice = newRentPrice;
  product.price = newPrice;

  if (updates.condition !== undefined) {
    if (["New with tags", "Like new", "Gently used"].includes(updates.condition)) {
      product.condition = updates.condition;
    }
  }

  // 3. Validate stock values as non-negative integers
  if (updates.stock !== undefined) {
    const parsedStock = Number(updates.stock);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return fail(res, 400, "Product stock must be a non-negative integer.");
    }
  }

  if (updates.sizeVariants !== undefined) {
    if (!Array.isArray(updates.sizeVariants)) {
      return fail(res, 400, "sizeVariants must be an array.");
    }
    for (const v of updates.sizeVariants) {
      if (!v.size || typeof v.size !== "string") {
        return fail(res, 400, "Each size variant must have a valid size.");
      }
      const vStock = Number(v.stock);
      if (!Number.isInteger(vStock) || vStock < 0) {
        return fail(res, 400, `Stock value for size '${v.size}' must be a non-negative integer.`);
      }
    }
  }

  // 4. Inventory reservation constraints validation
  const operationalRentals = await Rental.find({
    $or: [{ clothId: product.id }, { productId: product.id }],
    rentalStatus: { $in: OPERATIONAL_RENTAL_STATUSES }
  });

  const reservedSizes = new Set();
  const maxUnitBySize = {};

  for (const r of product.activeRentals || []) {
    if (r.size) {
      reservedSizes.add(r.size);
      maxUnitBySize[r.size] = Math.max(maxUnitBySize[r.size] || 0, r.unitIndex || 1);
    }
  }

  for (const r of operationalRentals) {
    if (r.size) {
      reservedSizes.add(r.size);
    }
  }

  // Constraint 1: Prevent removal of a size with operational reservations
  if (updates.sizeVariants !== undefined) {
    const proposedSizes = new Set(updates.sizeVariants.map((v) => v.size));
    for (const size of reservedSizes) {
      if (!proposedSizes.has(size)) {
        return fail(
          res,
          400,
          `Cannot remove size '${size}' because it has active or operational rental reservations.`
        );
      }
    }

    // Constraint 2: Prevent stock reductions that would invalidate existing unit assignments
    for (const v of updates.sizeVariants) {
      const maxAssigned = maxUnitBySize[v.size] || 0;
      const proposedStock = Number(v.stock);
      if (proposedStock < maxAssigned) {
        return fail(
          res,
          400,
          `Cannot reduce stock for size '${v.size}' to ${proposedStock}. Physical unit ${maxAssigned} is currently assigned to an active rental.`
        );
      }
    }
  } else if (updates.sizes !== undefined && Array.isArray(updates.sizes)) {
    const proposedSizes = new Set(updates.sizes);
    for (const size of reservedSizes) {
      if (!proposedSizes.has(size)) {
        return fail(
          res,
          400,
          `Cannot remove size '${size}' because it has active or operational rental reservations.`
        );
      }
    }
  }

  // Constraint 3: Single stock field reduction check
  if (updates.stock !== undefined && (!updates.sizeVariants || updates.sizeVariants.length === 0)) {
    const overallMaxUnit = Math.max(0, ...(product.activeRentals || []).map((r) => r.unitIndex || 1));
    const proposedStock = Number(updates.stock);
    if (proposedStock < overallMaxUnit) {
      return fail(
        res,
        400,
        `Cannot reduce total stock to ${proposedStock}. Physical unit ${overallMaxUnit} is currently assigned to an active rental.`
      );
    }
  }

  if (updates.sizeVariants && Array.isArray(updates.sizeVariants)) {
    product.sizeVariants = updates.sizeVariants;
  } else if (updates.sizes && Array.isArray(updates.sizes)) {
    product.sizes = updates.sizes;
  }

  if (updates.name !== undefined) product.name = updates.name;
  if (updates.category !== undefined) product.category = updates.category;
  if (updates.gender !== undefined) product.gender = updates.gender;
  if (updates.description !== undefined) product.description = updates.description;
  if (updates.securityDeposit !== undefined) product.securityDeposit = Number(updates.securityDeposit);
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
      metadata: { rentPrice: product.rentPrice, price: product.price, listingType: product.listingType }
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

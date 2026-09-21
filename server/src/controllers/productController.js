import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { ok, fail } from "../utils/respond.js";

export async function listProducts(req, res) {
  const { search = "", category = "", sort = "featured" } = req.query;

  const query = {};
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
  if (!product) return fail(res, 404, "Product not found.");
  return ok(res, product, "Product fetched.");
}

export async function createProduct(req, res) {
  const product = await Product.create({
    rating: 0,
    reviewsCount: 0,
    available: true,
    ...req.body
  });
  return ok(res, product, "Product created.");
}

export async function updateProduct(req, res) {
  const product = await Product.findByIdAndUpdate(req.params.productId, req.body, { new: true });
  if (!product) return fail(res, 404, "Product not found.");
  return ok(res, product, "Product updated.");
}

export async function deleteProduct(req, res) {
  const product = await Product.findByIdAndDelete(req.params.productId);
  if (!product) return fail(res, 404, "Product not found.");
  return ok(res, null, "Product deleted.");
}

export async function listCoupons(_req, res) {
  const coupons = await Coupon.find({ active: true });
  return ok(res, coupons, "Coupons fetched.");
}

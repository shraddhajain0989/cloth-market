import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    sku: String,
    barcode: String,
    description: String,
    tags: { type: [String], default: [] },
    images: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    price: { type: Number, default: 0 },
    rentPrice: { type: Number, default: 0 },
    securityDeposit: { type: Number, default: 0 },
    flashSalePrice: Number,
    stock: { type: Number, default: 0 },
    badge: String,
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    available: { type: Boolean, default: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

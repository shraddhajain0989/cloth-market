import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    gender: { type: String, default: "Unisex" },
    sku: String,
    barcode: String,
    description: String,
    tags: { type: [String], default: [] },
    images: { type: [String], default: [] },
    sizes: { type: [String], default: ["S", "M", "L", "XL"] },
    sizeVariants: [
      {
        size: { type: String, required: true },
        stock: { type: Number, default: 0, min: 0 },
        available: { type: Boolean, default: true }
      }
    ],
    price: { type: Number, default: 0 },
    rentPrice: { type: Number, default: 0 },
    securityDeposit: { type: Number, default: 0 },
    flashSalePrice: Number,
    stock: { type: Number, default: 0 },
    badge: String,
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    available: { type: Boolean, default: true },
    listingType: {
      type: String,
      enum: ["RENT", "RESELL", "BOTH"],
      default: "RENT"
    },
    condition: {
      type: String,
      enum: ["New with tags", "Like new", "Gently used"],
      default: "Like new"
    },
    activeRentals: [
      {
        rentalId: { type: String, required: true },
        size: { type: String, required: true },
        unitIndex: { type: Number, default: 1 },
        startDate: { type: String, required: true },
        endDate: { type: String, required: true }
      }
    ]
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Pre-save hook: sync total stock and sizes array from sizeVariants
productSchema.pre("save", function (next) {
  if (!this.listingType) {
    this.listingType = "RENT";
  }
  if (this.sizeVariants && this.sizeVariants.length > 0) {
    this.stock = this.sizeVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    this.sizes = this.sizeVariants.map((v) => v.size);
    if (this.stock === 0) {
      this.available = false;
    }
  }
  next();
});

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    label: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  { _id: false }
);

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: String,
    price: Number,
    image: String,
    quantity: { type: Number, default: 1 }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "master"], default: "user" },
    verified: { type: Boolean, default: false },
    avatar: String,
    loyaltyPoints: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    addresses: [addressSchema],
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
    wishlist: { type: [String], default: [] },
    cart: { type: [cartItemSchema], default: [] },
    refreshTokens: { type: [String], default: [] },
    resetPasswordToken: String,
    resetPasswordExpiry: Date
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);

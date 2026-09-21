import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    couponCode: String,
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, default: "Processing" },
    paymentMethod: { type: String, default: "cod" },
    paymentProviderStatus: { type: String, default: "pending" },
    trackingStatus: { type: String, default: "Order placed" },
    shippingAddress: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

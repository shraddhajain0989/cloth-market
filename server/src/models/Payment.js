import mongoose from "mongoose";

export const PAYMENT_STATUSES = [
  "Enquiry Initiated",
  "Awaiting Confirmation",
  "Awaiting Payment",
  "Payment Reported",
  "Verified",
  "Rejected",
  "Cancelled"
];

const paymentSchema = new mongoose.Schema(
  {
    customerReference: { type: String, required: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productImage: { type: String, default: "" },
    transactionType: {
      type: String,
      enum: ["RENT", "BUY"],
      required: true
    },
    size: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    
    // Rental-specific date fields
    rentalStartDate: { type: String },
    rentalEndDate: { type: String },
    rentalDuration: { type: Number, default: 1 },

    // Amounts
    expectedAmount: { type: Number, required: true }, // For RENT: ₹50 advance; For BUY: full selling price
    totalAmount: { type: Number, required: true }, // Total rental price or total purchase price
    advanceAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "Awaiting Payment"
    },

    // Administrative verification details
    adminNotes: { type: String, default: "" },
    transactionReference: { type: String, default: "" }, // UPI UTR / Reference ID
    rejectionReason: { type: String, default: "" },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },

    // Associated entity IDs
    rentalId: { type: String },
    orderId: { type: String }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

paymentSchema.virtual("customer").get(function () {
  return {
    id: this.customerId,
    name: this.customerName || "Customer",
    email: this.customerEmail || "",
    phone: this.customerPhone || ""
  };
});

paymentSchema.virtual("product").get(function () {
  return {
    id: this.productId,
    name: this.productName,
    images: this.productImage ? [this.productImage] : []
  };
});

export const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

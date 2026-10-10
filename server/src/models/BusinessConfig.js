import mongoose from "mongoose";

const businessConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    businessName: { type: String, default: "Cloth Market" },
    whatsappNumber: { type: String, default: "" }, // E.g. "919876543210"
    paymentQrUrl: { type: String, default: "" }, // Uploaded official business QR image URL
    upiId: { type: String, default: "" }, // E.g. "clothmarket@upi"
    paymentInstructions: {
      type: String,
      default: "Scan the official Cloth Market QR code, complete payment, and send a screenshot with your transaction ID on WhatsApp."
    },
    updatedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

export const BusinessConfig =
  mongoose.models.BusinessConfig || mongoose.model("BusinessConfig", businessConfigSchema);

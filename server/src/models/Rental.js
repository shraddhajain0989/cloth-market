import mongoose from "mongoose";

const rentalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    productId: { type: String, required: true },
    productName: String,
    durationDays: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    lateFeePerDay: { type: Number, default: 150 },
    pickupDate: String,
    returnDate: String,
    status: { type: String, default: "Booked" },
    reminderStatus: { type: String, default: "scheduled" },
    damageClaimStatus: { type: String, default: "none" }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Rental = mongoose.models.Rental || mongoose.model("Rental", rentalSchema);

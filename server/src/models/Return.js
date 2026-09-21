import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    userId: { type: String, required: true },
    reason: String,
    status: { type: String, default: "Requested" }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Return = mongoose.models.Return || mongoose.model("Return", returnSchema);

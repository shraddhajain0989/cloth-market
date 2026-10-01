import mongoose from "mongoose";

const handoverInspectionSchema = new mongoose.Schema(
  {
    condition: { type: String, default: "Good" },
    stains: { type: Boolean, default: false },
    tears: { type: Boolean, default: false },
    brokenButtons: { type: Boolean, default: false },
    brokenZipper: { type: Boolean, default: false },
    fabricDamage: { type: Boolean, default: false },
    missingAccessories: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    photos: { type: [String], default: [] },
    inspectedBy: String,
    inspectedAt: Date,
    customerAcknowledged: { type: Boolean, default: false },
    customerAcknowledgedAt: Date
  },
  { _id: false }
);

const returnInspectionSchema = new mongoose.Schema(
  {
    condition: { type: String, default: "Good" },
    stains: { type: Boolean, default: false },
    tears: { type: Boolean, default: false },
    fabricDamage: { type: Boolean, default: false },
    missingAccessories: { type: Boolean, default: false },
    brokenButtons: { type: Boolean, default: false },
    brokenZipper: { type: Boolean, default: false },
    otherDamage: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    photos: { type: [String], default: [] },
    inspectedBy: String,
    inspectedAt: Date
  },
  { _id: false }
);

const extensionSchema = new mongoose.Schema(
  {
    requestedEndDate: { type: String, required: true },
    previousEndDate: { type: String, required: true },
    additionalDays: { type: Number, required: true },
    additionalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "REJECTED"],
      default: "REQUESTED"
    },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: String
  },
  { _id: false }
);

const damageReportSchema = new mongoose.Schema(
  {
    damageDetected: { type: Boolean, default: false },
    description: { type: String, default: "" },
    severity: { type: String, enum: ["minor", "moderate", "severe"], default: "minor" },
    photos: { type: [String], default: [] },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["NONE", "DAMAGE_REPORTED", "DAMAGE_PENDING", "DAMAGE_ACKNOWLEDGED", "DAMAGE_RESOLVED"],
      default: "NONE"
    },
    reportedAt: Date,
    reportedBy: String,
    resolvedAt: Date
  },
  { _id: false }
);

const rentalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    clothId: { type: String, required: true, index: true },
    productId: { type: String, index: true }, // Alias
    productName: { type: String, default: "" },
    clothSnapshot: {
      name: { type: String, default: "" },
      category: { type: String, default: "" },
      image: { type: String, default: "" },
      rentPrice: { type: Number, default: 0 }
    },
    size: { type: String, required: true },
    rentalStartDate: { type: String, required: true },
    originalEndDate: { type: String, required: true },
    currentEndDate: { type: String, required: true },
    rentalDuration: { type: Number, required: true, default: 1 },
    rentalAmount: { type: Number, required: true }, // Authoritative total price locked at booking
    originalRentalAmount: { type: Number },
    extensionAmount: { type: Number, default: 0 },
    priceSnapshot: {
      dailyRate: { type: Number, default: 0 },
      durationDays: { type: Number, default: 1 },
      totalRental: { type: Number, default: 0 }
    },
    advanceAmount: { type: Number, default: 50 }, // ₹50 advance (INCLUDED in total rental amount)
    advanceStatus: {
      type: String,
      enum: ["ADVANCE_PENDING", "ADVANCE_RECEIVED"],
      default: "ADVANCE_PENDING"
    },
    remainingAmount: { type: Number, required: true }, // rentalAmount - advanceAmount
    remainingPaymentStatus: {
      type: String,
      enum: ["REMAINING_PENDING", "REMAINING_RECEIVED"],
      default: "REMAINING_PENDING"
    },
    paymentMethod: { type: String, default: "CASH" },
    rentalStatus: {
      type: String,
      enum: [
        "PENDING_ADVANCE",
        "CONFIRMED",
        "READY_FOR_HANDOVER",
        "HANDOVER_INSPECTION",
        "ACTIVE_RENTAL",
        "EXTENSION_REQUESTED",
        "EXTENDED",
        "RETURN_INSPECTION",
        "DAMAGE_REPORTED",
        "DAMAGE_SETTLEMENT",
        "COMPLETED",
        "CANCELLED"
      ],
      default: "PENDING_ADVANCE"
    },
    handoverInspection: { type: handoverInspectionSchema, default: () => ({}) },
    returnInspection: { type: returnInspectionSchema, default: () => ({}) },
    extensionHistory: { type: [extensionSchema], default: [] },
    damageReport: { type: damageReportSchema, default: () => ({}) },
    
    // Legacy fields for backward compatibility
    total: { type: Number },
    deposit: { type: Number, default: 0 },
    lateFeePerDay: { type: Number, default: 150 },
    pickupDate: { type: String },
    returnDate: { type: String },
    status: { type: String, default: "PENDING_ADVANCE" },
    reminderStatus: { type: String, default: "scheduled" },
    damageClaimStatus: { type: String, default: "none" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-validate sync: ensure legacy aliases and defaults exist before required schema validation runs
rentalSchema.pre("validate", function (next) {
  if (!this.clothId && this.productId) this.clothId = this.productId;
  if (!this.productId && this.clothId) this.productId = this.clothId;
  if (!this.rentalStartDate && this.pickupDate) this.rentalStartDate = this.pickupDate;
  if (!this.pickupDate && this.rentalStartDate) this.pickupDate = this.rentalStartDate;
  if (!this.currentEndDate && this.returnDate) this.currentEndDate = this.returnDate;
  if (!this.returnDate && this.currentEndDate) this.returnDate = this.currentEndDate;
  if (!this.originalEndDate) this.originalEndDate = this.currentEndDate || this.returnDate;
  if (!this.size) this.size = "M";
  if (!this.rentalDuration) this.rentalDuration = this.durationDays || 1;
  if (this.rentalAmount === undefined && this.total !== undefined) this.rentalAmount = this.total;
  if (this.total === undefined && this.rentalAmount !== undefined) this.total = this.rentalAmount;
  if (this.originalRentalAmount === undefined && this.rentalAmount !== undefined) this.originalRentalAmount = this.rentalAmount;
  if (!this.status && this.rentalStatus) this.status = this.rentalStatus;
  if (!this.rentalStatus && this.status) this.rentalStatus = this.status;
  if (!this.productName && this.clothSnapshot?.name) this.productName = this.clothSnapshot.name;
  if (this.advanceAmount === undefined && this.rentalAmount !== undefined) {
    this.advanceAmount = Math.min(50, this.rentalAmount);
  }
  if (this.remainingAmount === undefined && this.rentalAmount !== undefined) {
    this.remainingAmount = Math.max(0, this.rentalAmount - (this.advanceAmount || 50));
  }
  next();
});

// Pre-save sync to keep legacy and new fields consistent
rentalSchema.pre("save", function (next) {
  if (!this.productId) this.productId = this.clothId;
  if (!this.clothId) this.clothId = this.productId;
  if (!this.pickupDate) this.pickupDate = this.rentalStartDate;
  if (!this.returnDate) this.returnDate = this.currentEndDate;
  if (!this.rentalStartDate) this.rentalStartDate = this.pickupDate;
  if (!this.currentEndDate) this.currentEndDate = this.returnDate;
  if (!this.originalEndDate) this.originalEndDate = this.returnDate;
  if (!this.total) this.total = this.rentalAmount;
  if (!this.rentalAmount) this.rentalAmount = this.total || 0;
  if (this.originalRentalAmount === undefined) this.originalRentalAmount = this.rentalAmount;
  if (!this.status) this.status = this.rentalStatus;
  if (!this.rentalStatus) this.rentalStatus = this.status;
  if (!this.productName && this.clothSnapshot?.name) this.productName = this.clothSnapshot.name;
  if (!this.remainingAmount && this.rentalAmount) {
    this.remainingAmount = Math.max(0, this.rentalAmount - (this.advanceAmount || 50));
  }
  next();
});

export const Rental = mongoose.models.Rental || mongoose.model("Rental", rentalSchema);

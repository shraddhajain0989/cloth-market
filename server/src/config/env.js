import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Server
  port: Number(process.env.PORT || 5002),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  // Auth
  jwtSecret: process.env.JWT_SECRET || "cloth-market-dev-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "cloth-market-refresh-secret",

  // Database
  mongoUri: process.env.MONGODB_URI || "",

  // Cloudinary
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",

  // Payments
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",

  // Email (for future use)
  emailFrom: process.env.EMAIL_FROM || "noreply@clothmarket.com",
  resendApiKey: process.env.RESEND_API_KEY || ""
};

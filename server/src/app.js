import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { notFound } from "./middleware/not-found.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import rentalRoutes from "./routes/rentalRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import userRoutes from "./routes/userRoutes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        const allowedOrigins = [env.clientUrl, "http://localhost:5173", "http://localhost:5174"];
        if (allowedOrigins.includes(origin) || env.nodeEnv === "development") {
          return callback(null, true);
        }
        return callback(new Error("CORS policy does not allow access from this origin."));
      },
      credentials: true
    })
  );
  app.use(rateLimit({ windowMs: 60 * 1000, limit: 120 }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(morgan("dev"));

  // Liveness check
  app.get("/api/health", (_req, res) => {
    res.json({ success: true, status: "healthy", message: "Cloth Market API is running." });
  });

  // Readiness check — verifies database connection
  app.get("/api/health/ready", (_req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      return res.status(503).json({
        success: false,
        status: "unready",
        message: "Database connection is unavailable."
      });
    }
    return res.json({
      success: true,
      status: "ready",
      message: "Cloth Market API and database are fully operational."
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/rentals", rentalRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/social", socialRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/upload", uploadRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

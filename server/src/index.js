import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

async function start() {
  await connectDB();
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`🚀 Cloth Market API running on port ${env.port} [${env.nodeEnv}]`);
  });

  async function shutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log("HTTP server closed.");
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();

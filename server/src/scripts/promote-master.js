import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

async function promoteMaster() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node src/scripts/promote-master.js <user-email>");
    process.exit(1);
  }

  const mongoUri = env.mongoUri;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not configured in environment.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    user.role = "master";
    user.status = "active";
    await user.save();

    console.log(`✅ Successfully promoted ${user.email} (${user.name}) to 'master' role.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error promoting user to master:", err.message);
    process.exit(1);
  }
}

promoteMaster();

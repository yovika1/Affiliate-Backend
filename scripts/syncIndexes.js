import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/Product.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("[indexes] MongoDB connected");

    const indexes = await Product.syncIndexes();
    console.log("[indexes] Product indexes synced", indexes);

    process.exit(0);
  } catch (error) {
    console.error("[indexes] Sync failed:", error.message);
    process.exit(1);
  }
};

run();

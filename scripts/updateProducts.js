// scripts/updateProducts.js

import dotenv from "dotenv";
import mongoose from "mongoose";
import { updateProducts } from "../services/productUpdateService.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("MongoDB connected");

  await updateProducts();

  process.exit(0);
};

run();
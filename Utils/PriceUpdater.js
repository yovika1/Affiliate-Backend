import cron from "node-cron";
import Product from "../models/Product.js";
import { fetchProductPrice } from "./fetchProductPrice.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function updateAllProductPrices() {
  console.log("🔄 Running daily price update...");

  try {
    const products = await Product.find();

    for (const [i, product] of products.entries()) {
      await sleep(2000);

      const data = await fetchProductPrice(product.productUrl);

      if (!data || !data.currentPrice) {
        console.log(`⚠️ [${i + 1}] Skipping invalid product: ${product.productName}`);
        continue;
      }

      product.currentPrice = data.currentPrice;
      product.originalPrice = data.originalPrice;
      product.discountPercent = data.discountPercent;
      product.rating = data.rating;
      product.reviewsCount = data.reviewsCount;
      product.lastPriceUpdated = new Date();
          

      await product.save();
      console.log(`✔️ [${i + 1}] Updated: ${product.productName}`);
    }

    console.log("🎉 All prices updated successfully!");
  } catch (error) {
    console.log("❌ Error updating prices:", error);
  }
}

// Run every day at midnight
cron.schedule("0 0 * * *", updateAllProductPrices);

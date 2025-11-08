import cron from "node-cron";
import Product from "../models/Product.js";
import { fetchProductPrice } from "./fetchProductPrice.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function updateAllProductPrices() {

  try {
    const products = await Product.find();

    for (const [i, product] of products.entries()) {
      await sleep(2000);

      const targetUrl = product.productUrl || product.affiliateUrl;

      // ✅ Skip if no valid URL
      if (!targetUrl) {
        console.log(
          `⚠️ [${i + 1}] Skipping product with no valid URL: ${
            product.productName
          }`
        );
        continue;
      }

      const priceData = await fetchProductPrice(targetUrl);
      if (priceData.productName === "Unknown Product") {
        console.log(
          `🚫 [${i + 1}] Skipping invalid product: ${product.productName}`
        );
        continue;
      }

      if (priceData && priceData.currentPrice) {
        const { currentPrice, originalPrice } = priceData;

        if (currentPrice !== product.currentPrice) {
          product.originalPrice =
            originalPrice || product.originalPrice || product.currentPrice;
          product.currentPrice = currentPrice;
          product.lastUpdated = new Date();

          await product.save();
        } else {
          console.log(`✅ [${i + 1}] ${product.productName} is up-to-date`);
        }
      } else {
        console.log(
          `⚠️ [${i + 1}] Skipped invalid or missing product data for ${
            product.productName
          }`
        );
      }
    }

  } catch (err) {
    console.error("❌ Error updating prices:", err.message);
  }
}

// ⏰ Run every day at 1 AM
cron.schedule("0 1 * * *", updateAllProductPrices);

// Run immediately on startup 
updateAllProductPrices();

import Product from "../models/Product.js";
import { buildProductSearchText, normalizeText } from "../utils/searchHelpers.js";
import { detectCategory, isUnsupportedProduct } from "../utils/detectCategory.js";

const normalizeTags = (tags = []) =>
  Array.isArray(tags)
    ? tags.map((tag) => normalizeText(tag)).filter(Boolean)
    : [];

export const updateProducts = async () => {
  try {
    await Product.updateMany(
      { isSearchable: { $exists: false } },
      { $set: { isSearchable: true } },
    );

    const products = await Product.find();

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      const rawProduct = product.toObject();
      const isSearchable = !isUnsupportedProduct(product.productName || "");
      const detectedCategory = detectCategory(product.productName || "");
      const category = isSearchable
        ? detectedCategory || product.category || "tshirt"
        : product.category || "tshirt";
      const brand = normalizeText(product.brand || "unknown") || "unknown";
      const tags = normalizeTags(product.tags);
      const searchableText = buildProductSearchText({
        ...rawProduct,
        category,
        brand,
        tags,
      });

      const nextValues = {
        category,
        brand,
        isSearchable,
        tags,
        searchableText,
      };

      const hasStoredSearchableFlag = Object.prototype.hasOwnProperty.call(
        rawProduct,
        "isSearchable",
      );

      const isUnchanged =
        product.category === nextValues.category &&
        product.brand === nextValues.brand &&
        hasStoredSearchableFlag &&
        product.isSearchable === nextValues.isSearchable &&
        product.searchableText === nextValues.searchableText &&
        JSON.stringify(product.tags || []) === JSON.stringify(nextValues.tags);

      if (isUnchanged) {
        skipped += 1;
        continue;
      }

      await Product.updateOne(
        { _id: product._id },
        {
          $set: nextValues,
        },
      );

      updated += 1;
      console.log("[products] Refreshed:", product.productName);
    }

    console.log("[products] Update complete", { updated, skipped, total: products.length });
  } catch (err) {
    console.error("[products] Update error:", err.message);
  }
};

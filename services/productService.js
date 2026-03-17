import Product from "../models/Product.js";
import {
  normalizeMessage,
  correctTypos,
  recommendationMap,
  removeColors,
  detectProductType,
} from "../Utils/searchHelper.js";

import { extractKeywords } from "./aiKeywordService.js";

export const searchProducts = async (message) => {
  let words = message.toLowerCase().split(" ");

  words = correctTypos(words);
  words = normalizeMessage(words);
  words = removeColors(words);

  const productType = detectProductType(words);

  let keywords = await extractKeywords(words.join(" "));

  if (typeof keywords === "string") {
    keywords = keywords
      .split("|")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  const searchWords = [...new Set([...words, ...keywords])];

  const filteredWords = searchWords.filter((word) => word.length > 2);

  const safeRegex = filteredWords
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  const regex = new RegExp(safeRegex, "i");

  let products = [];

  if (productType) {
    let query = {
      $or: [
        { productName: regex },
        { subCategory: regex },
        { tags: { $in: filteredWords } },
      ],
    };

    if (!message.includes("makeup") && !message.includes("skincare")) {
      query.category = "fashion";
    }

    products = await Product.find(query)
      .sort({ rating: -1, discountPercent: -1 })
      .limit(4);
  }

  if (products.length === 0) {
    products = await Product.find({
      productName: regex,
      category: "fashion",
    })
      .sort({ rating: -1 })
      .limit(4);
  }

  // 7️⃣ recommendation logic
  for (const word of searchWords) {
    if (recommendationMap[word]) {
      const recommended = await Product.findOne({
        category: recommendationMap[word],
      });

      if (recommended && !products.find((p) => p._id.equals(recommended._id))) {
        products.push(recommended);
      }

      break;
    }
  }

  return products;
};

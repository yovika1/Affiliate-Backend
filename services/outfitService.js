import Product from "../models/Product.js";
import { searchProducts } from "./searchService.js";

const MAKEUP_KEYWORDS_BY_OCCASION = {
  party: ["lipstick", "blush", "concealer", "makeup spray"],
  formal: ["concealer", "compact", "lipstick"],
  casual: ["lipstick", "concealer", "makeup spray"],
  college: ["lipstick", "concealer"],
  gym: ["makeup spray"],
};

const pickBestProduct = async (category, fallbackCategories = []) => {
  const categories = [category, ...fallbackCategories].filter(Boolean);

  for (const currentCategory of categories) {
    const product = await Product.findOne({
      isSearchable: true,
      category: currentCategory,
    })
      .sort({ rating: -1, reviewsCount: -1, currentPrice: 1 })
      .lean();

    if (product) return product;
  }

  return null;
};

const buildMakeupPatterns = (occasion = "casual", makeupLook = null, query = "") => {
  const baseKeywords =
    MAKEUP_KEYWORDS_BY_OCCASION[occasion] || MAKEUP_KEYWORDS_BY_OCCASION.casual;

  const queryHints = [];
  if (/party|wedding|festive/i.test(query)) queryHints.push("blush", "lipstick");
  if (/glow|dewy/i.test(query)) queryHints.push("makeup spray");
  if (/simple|light|natural/i.test(query)) queryHints.push("concealer");

  return [...new Set([...baseKeywords, ...queryHints])];
};

const fetchMakeupProducts = async (
  occasion = "casual",
  makeupLook = null,
  query = ""
) => {  const keywords = buildMakeupPatterns(occasion, query);

  const products = await Promise.all(
    keywords.map(async (keyword) => {
      const pattern = new RegExp(keyword.replace(/\s+/g, "\\s+"), "i");

      return Product.findOne({
        productName: pattern,
      })
        .sort({ rating: -1, currentPrice: 1 })
        .lean();
    }),
  );

  const unique = new Map();

  products.filter(Boolean).forEach((product) => {
    const id = product._id?.toString?.() || product._id;
    if (!id || unique.has(id)) return;
    unique.set(id, product);
  });

  return Array.from(unique.values()).slice(0, 3);
};

export const fetchOutfitProducts = async (structure = {}, query = "") => {
  const topCategory = structure.top || "tshirt";
  const bottomCategory = structure.bottom || "jeans";
  const occasion = structure.occasion || "casual";
  const shouldShowMakeup =
  structure.gender === "women" &&
  structure.makeupLook &&
  structure.makeupLook !== "none";

if (topCategory === "dress") {
  const [dresses, makeup] = await Promise.all([
    searchProducts({
      category: "dresses",
      style: structure.style,
    }),

      shouldShowMakeup
      ? fetchMakeupProducts(
          occasion,
          structure.makeupLook,
          query
        )
      : Promise.resolve([]),
  ]);

  return {
    top: dresses.slice(0, 2),
    bottom: null,
    makeup,
  };
}

const [tops, bottoms, makeup] = await Promise.all([
  searchProducts({
    category: topCategory,
    style: structure.style,
  }),

  searchProducts({
    category: bottomCategory,
    style: structure.style,
  }),

 shouldShowMakeup
    ? fetchMakeupProducts(
        occasion,
        structure.makeupLook,
        query
      )
    : Promise.resolve([]),
]);

return {
  top: tops.slice(0, 2),
  bottom: bottoms.slice(0, 2),
  makeup,
};
};

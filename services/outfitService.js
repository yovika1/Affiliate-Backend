import Product from "../models/Product.js";

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

const buildMakeupPatterns = (occasion = "casual", query = "") => {
  const baseKeywords =
    MAKEUP_KEYWORDS_BY_OCCASION[occasion] || MAKEUP_KEYWORDS_BY_OCCASION.casual;

  const queryHints = [];
  if (/party|wedding|festive/i.test(query)) queryHints.push("blush", "lipstick");
  if (/glow|dewy/i.test(query)) queryHints.push("makeup spray");
  if (/simple|light|natural/i.test(query)) queryHints.push("concealer");

  return [...new Set([...baseKeywords, ...queryHints])];
};

const fetchMakeupProducts = async (occasion = "casual", query = "") => {
  const keywords = buildMakeupPatterns(occasion, query);

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

  if (topCategory === "dress") {
    const [dress, makeup] = await Promise.all([
      pickBestProduct("dress"),
      fetchMakeupProducts(occasion, query),
    ]);

    return { top: dress, bottom: null, makeup };
  }

  const [top, bottom, makeup] = await Promise.all([
    pickBestProduct(topCategory, ["shirt", "tshirt"]),
    pickBestProduct(bottomCategory, ["jeans"]),
    fetchMakeupProducts(occasion, query),
  ]);

  return { top, bottom, makeup };
};

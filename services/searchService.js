import Product from "../models/Product.js";
import {
  escapeRegex,
  expandSearchTerms,
  extractSearchKeywords,
  normalizeIntent,
  normalizeText,
} from "../Utils/searchHelpers.js";

const RESULT_LIMIT = 12;
const CANDIDATE_LIMIT = 60;
const MIN_SEARCH_SCORE = 45;

const buildPattern = (value = "") => new RegExp(escapeRegex(value), "i");

const buildKeywordClauses = (terms = []) =>
  terms.map((term) => {
    const pattern = buildPattern(term);
    return {
      $or: [
        { productName: pattern },
        { brand: pattern },
        { searchableText: pattern },
        { tags: pattern },
      ],
    };
  });

const buildTextSearchQuery = (intent, queryText, terms) => {
  const textTerms = [
    queryText,
    intent.brand !== "unknown" ? intent.brand : "",
    intent.category || "",
    intent.useCase || "",
    ...terms,
  ]
    .map((term) => normalizeText(term))
    .filter(Boolean);

  return [...new Set(textTerms)].join(" ");
};

const buildStrictFilters = (intent) => {
  const filters = [{ isSearchable: true }];

  if (intent.category) {
    filters.push({ category: intent.category });
  }

  if (intent.subCategory) {
    filters.push({ subCategory: intent.subCategory });
  }
  if (intent.brand && intent.brand !== "unknown") {
    filters.push({ brand: intent.brand });
  }

  if (intent.gender) {
    filters.push({
      $or: [{ gender: intent.gender }, { gender: { $exists: false } }],
    });
  }

  if (intent.style) {
    filters.push({ style: intent.style });
  }

  if (intent.color) {
    filters.push({ color: intent.color });
  }

  if (intent.pattern) {
    filters.push({ pattern: intent.pattern });
  }

  if (intent.useCase) {
    filters.push({
      $or: [
        { useCase: intent.useCase },
        { useCase: "casual" },
        { useCase: { $exists: false } },
      ],
    });
  }

  if (intent.budget) {
    filters.push({
      $or: [
        { currentPrice: { $lte: intent.budget } },
        { currentPrice: null },
        { currentPrice: { $exists: false } },
      ],
    });
  }

  return filters;
};

const buildRelaxedFilters = (intent) => {
  const filters = [{ isSearchable: true }];

  if (intent.category) filters.push({ category: intent.category });
  if (intent.subCategory) {
    filters.push({ subCategory: intent.subCategory });
  }
  if (intent.brand && intent.brand !== "unknown")
    filters.push({ brand: intent.brand });
  if (intent.gender)
    filters.push({
      $or: [{ gender: intent.gender }, { gender: { $exists: false } }],
    });
  if (intent.style) {
    filters.push({ style: intent.style });
  }

  if (intent.budget) {
    filters.push({
      $or: [
        { currentPrice: { $lte: intent.budget * 1.15 } },
        { currentPrice: null },
        { currentPrice: { $exists: false } },
      ],
    });
  }

  return filters;
};

const scoreTokenCoverage = (haystack, terms) => {
  if (!terms.length) return 0;

  let score = 0;
  let matched = 0;

  terms.forEach((term) => {
    if (haystack.includes(term)) {
      matched += 1;
      score += term.includes(" ") ? 10 : 6;
    }
  });

  score += (matched / terms.length) * 25;
  return score;
};

const countMatchedTerms = (haystack, terms = []) =>
  terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);

const scoreProduct = (product, intent, terms, queryText = "") => {
  let score = 0;
  const normalizedQuery = normalizeText(queryText);
  const haystack = normalizeText(
    [
      product.productName,
      product.brand,
      product.category,
      product.subCategory,
      product.gender,
      product.style,
      product.color,
      product.pattern,
      product.useCase,
      product.searchableText,
      ...(Array.isArray(product.tags) ? product.tags : []),
    ].join(" "),
  );
  const productName = normalizeText(product.productName);
  const textScore = Number(product.textScore || 0);

  score += textScore * 20;
  score += scoreTokenCoverage(haystack, terms);

  if (normalizedQuery && haystack.includes(normalizedQuery)) score += 35;
  if (normalizedQuery && productName.includes(normalizedQuery)) score += 30;

  const keywordTerms = intent.keywords?.length
    ? intent.keywords
    : extractSearchKeywords(queryText, 8);
  keywordTerms.forEach((keyword) => {
    if (productName.includes(keyword)) score += 12;
    else if (haystack.includes(keyword)) score += 7;
  });

  if (intent.category && product.category === intent.category) score += 32;
  if (intent.subCategory) {
    if (product.subCategory === intent.subCategory) score += 30;
    else if (product.subCategory) score -= 50;
  }
  if (intent.brand !== "unknown" && product.brand === intent.brand) score += 25;
  if (intent.gender) {
    if (product.gender === intent.gender) score += 15;
    else if (product.gender) score -= 100;
  }
  if (intent.useCase && product.useCase === intent.useCase) score += 12;
  if (intent.color && product.color === intent.color) {
    score += 20;
  }

  if (intent.style && product.style === intent.style) {
    score += 40;
  }
  if (intent.pattern && product.pattern && intent.pattern === product.pattern) {
    score += 15;
  }
  if (typeof product.rating === "number") score += product.rating * 5;
  if (typeof product.reviewsCount === "number") {
    score += Math.min(12, Math.log10(product.reviewsCount + 1) * 4);
  }

  if (typeof product.currentPrice === "number") {
    score += Math.max(0, 20 - product.currentPrice / 400);

    if (intent.budget) {
      if (product.currentPrice <= intent.budget) {
        score += 20;
        score += Math.max(0, 10 - (intent.budget - product.currentPrice) / 700);
      } else {
        score -= Math.min(25, (product.currentPrice - intent.budget) / 200);
      }
    }
  }

  return score;
};

const isHighConfidenceMatch = (
  product,
  score,
  intent,
  terms,
  queryText = "",
) => {
  const normalizedQuery = normalizeText(queryText);
  const haystack = normalizeText(
    [
      product.productName,
      product.brand,
      product.category,
      product.gender,
      product.useCase,
      product.searchableText,
      ...(Array.isArray(product.tags) ? product.tags : []),
    ].join(" "),
  );
  const matchedTerms = countMatchedTerms(haystack, terms);
  const minimumMatchedTerms = Math.min(
    3,
    Math.max(1, Math.ceil(Math.min(terms.length, 6) / 2)),
  );

  if (
    intent.gender &&
    product.gender &&
    product.gender !== intent.gender
) {
    return false;
}

if (
    intent.subCategory &&
    product.subCategory &&
    product.subCategory !== intent.subCategory
) {
    return false;
}
  if (!normalizedQuery) return score >= MIN_SEARCH_SCORE;
  if (product.textScore && Number(product.textScore) >= 1.5) return true;
  if (
    intent.category &&
    product.category === intent.category &&
    matchedTerms >= 1
  )
    return true;
  if (intent.brand !== "unknown" && product.brand === intent.brand) return true;
  if (haystack.includes(normalizedQuery)) return true;

  return score >= MIN_SEARCH_SCORE && matchedTerms >= minimumMatchedTerms;
};

const dedupeProducts = (groups = []) => {
  const merged = new Map();

  groups.flat().forEach((product) => {
    const id = product?._id?.toString?.() || product?._id;
    if (!id) return;

    const existing = merged.get(id);
    if (!existing) {
      merged.set(id, product);
      return;
    }

    const existingScore = Number(existing.textScore || 0);
    const candidateScore = Number(product.textScore || 0);
    if (candidateScore > existingScore) {
      merged.set(id, { ...existing, ...product });
    }
  });

  return Array.from(merged.values());
};

const fetchTextMatches = async (intent, queryText, filters, terms) => {
  const textSearch = buildTextSearchQuery(intent, queryText, terms);
  if (!textSearch) return [];

  const query = {
    ...(filters.length ? { $and: filters } : {}),
    $text: { $search: textSearch },
  };

  return Product.find(query, { score: { $meta: "textScore" } })
    .select({
      productName: 1,
      brand: 1,
      category: 1,
      gender: 1,
      useCase: 1,
      tags: 1,
      searchableText: 1,
      currentPrice: 1,
      originalPrice: 1,
      discountPercent: 1,
      rating: 1,
      reviewsCount: 1,
      style: 1,
      color: 1,
      pattern: 1,
      imageUrl: 1,
      productUrl: 1,
      affiliateUrl: 1,
      affiliateType: 1,
      textScore: { $meta: "textScore" },
    })
    .sort({ score: { $meta: "textScore" }, rating: -1 })
    .limit(CANDIDATE_LIMIT)
    .lean();
};

const fetchRegexMatches = async (filters, terms, limit = CANDIDATE_LIMIT) => {
  const keywordClauses = buildKeywordClauses(terms);
  const query = {};

  if (filters.length) query.$and = filters;
  if (keywordClauses.length)
    query.$or = keywordClauses.flatMap((clause) => clause.$or);

  return Product.find(query).limit(limit).lean();
};

export const searchProducts = async (intentInput, queryText = "") => {
  try {
    const intent = normalizeIntent(intentInput, queryText);
    const expandedTerms = expandSearchTerms(intent, queryText);
    const strictFilters = buildStrictFilters(intent);
    const relaxedFilters = buildRelaxedFilters(intent);

    console.log("[search] Starting strong search", {
      intent,
      queryText,
      expandedTerms,
    });

    const [textStrict, regexStrict, textRelaxed] = await Promise.all([
      fetchTextMatches(intent, queryText, strictFilters, expandedTerms),
      fetchRegexMatches(strictFilters, expandedTerms),
      fetchTextMatches(intent, queryText, relaxedFilters, expandedTerms),
    ]);

    let candidates = dedupeProducts([textStrict, regexStrict, textRelaxed]);

    if (!candidates.length) {
      console.log(
        "[search] Primary pools empty, trying category and keyword fallback",
      );

     let categoryFallback = [];

if (intent.category) {
  const categoryQuery = {
    isSearchable: true,
    category: intent.category,
  };

  if (intent.gender) {
    categoryQuery.gender = intent.gender;
  }

  categoryFallback = await Product.find(categoryQuery)
    .limit(CANDIDATE_LIMIT)
    .lean();
}

      const regexRelaxed = await fetchRegexMatches(
        relaxedFilters,
        expandedTerms,
        CANDIDATE_LIMIT,
      );
      candidates = dedupeProducts([categoryFallback, regexRelaxed]);
    }

    if (!candidates.length) {
      console.log("[search] Final query-aware fallback triggered");

      const broadTerms = intent.keywords?.length
        ? intent.keywords
        : extractSearchKeywords(queryText, 4);
      const fallback = [{ isSearchable:true }];

if(intent.gender)
    fallback.push({ gender:intent.gender });

candidates =
await fetchRegexMatches(
    fallback,
    broadTerms,
    24
);
    }

    const rankedProducts = candidates
      .map((product) => ({
        product,
        score: scoreProduct(product, intent, expandedTerms, queryText),
      }))
      .sort((a, b) => b.score - a.score)
      .filter(({ product, score }) =>
        isHighConfidenceMatch(product, score, intent, expandedTerms, queryText),
      )
      .slice(0, RESULT_LIMIT)
      .map(({ product }) => product);

    console.log("[search] Final ranked results", {
      count: rankedProducts.length,
    });

    return rankedProducts;
  } catch (error) {
    console.error("[search] Strong search error:", error.message);
    return [];
  }
};

const ALLOWED_CATEGORIES = [
  "fashion",
  "beauty",
  "general",
];

const ALLOWED_SUBCATEGORIES = [
  "dresses",
  "jeans",
  "shirt",
  "tshirt",
  "kurta",
  "makeup",
  "skincare",
  "perfume",
  "haircare",
];

const ALLOWED_GENDERS = ["men", "women"];

const ALLOWED_USE_CASES = [
  "casual",
  "formal",
  "gym",
  "party",
  "college",
  "office",
  "travel",
  "wedding",
];

const CATEGORY_ALIASES = {
  tshirt: ["tshirt", "t-shirt", "tee", "tees"],
  shirt: ["shirt", "shirts", "polo"],
  jeans: ["jeans", "jean", "denim", "denims"],
  dresses: ["dresses", "dresses", "gown", "gowns"],
  skincare: ["skincare", "face wash", "serum", "moisturizer"],
makeup: ["makeup", "lipstick", "foundation", "concealer"],
perfume: ["perfume", "fragrance", "deo"],
};

const USE_CASE_KEYWORDS = {
  casual: ["casual", "everyday", "daily", "relaxed"],
  formal: ["formal", "office", "work", "meeting", "professional"],
  gym: ["gym", "workout", "training", "sports", "running", "fitness"],
  party: ["party", "wedding", "festive", "night out", "celebration"],
  college: ["college", "campus", "class", "student"],
};

const GENDER_KEYWORDS = {
  men: ["men", "male", "boy", "boys", "man", "mens"],
  women: [
    "women",
    "female",
    "girl",
    "girls",
    "woman",
    "womens",
    "ladies",
    "lady",
  ],
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "best",
  "buy",
  "for",
  "from",
  "give",
  "i",
  "in",
  "me",
  "my",
  "need",
  "please",
  "product",
  "products",
  "recommend",
  "search",
  "show",
  "something",
  "suggest",
  "that",
  "the",
  "under",
  "want",
  "with",
]);

const CATEGORY_PRIORITY_TERMS = {
  tshirt: ["tshirt", "t shirt", "tee", "tees", "crew neck", "oversized"],
  shirt: [
    "shirt",
    "shirts",
    "polo",
    "button down",
    "formal shirt",
    "casual shirt",
  ],
  jeans: ["jeans", "jean", "denim", "slim fit", "straight fit"],
  dresses: ["dresses", "dresses", "gown", "maxi", "midi"],
};


export const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/\bt[\s-]?shirts?\b/g, " tshirt ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const extractBudgetFromText = (text = "") => {
  const normalized = normalizeText(text);
  const matches = normalized.match(/\b\d{2,6}\b/g);
  if (!matches?.length) return null;

  const values = matches.map(Number).filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : null;
};

export const extractSearchKeywords = (text = "", limit = 6) => {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const tokens = normalized
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  return [...new Set(tokens)].slice(0, limit);
};

const hasPhrase = (text, phrase) => {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;

  const escapedPhrase = escapeRegex(normalizedPhrase).replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escapedPhrase}\\b`, "i").test(text);
};

export const inferCategoryFromText = (text = "") => {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  for (const [category, keywords] of Object.entries(CATEGORY_ALIASES)) {
    if (keywords.some((keyword) => hasPhrase(normalized, keyword))) {
      return category;
    }
  }

  return null;
};

export const inferUseCaseFromText = (text = "") => {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  for (const [useCase, keywords] of Object.entries(USE_CASE_KEYWORDS)) {
    if (keywords.some((keyword) => hasPhrase(normalized, keyword))) {
      return useCase;
    }
  }

  return null;
};

export const inferGenderFromText = (text = "") => {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  for (const [gender, keywords] of Object.entries(GENDER_KEYWORDS)) {
    if (keywords.some((keyword) => hasPhrase(normalized, keyword))) {
      return gender;
    }
  }

  return null;
};

export const getCategoryKeywords = (category = "") =>
  CATEGORY_PRIORITY_TERMS[category] || [];

export const expandSearchTerms = (intent = {}, query = "") => {
  const queryKeywords = extractSearchKeywords(query, 10);
  const categoryKeywords = getCategoryKeywords(intent.category);
  const useCaseKeywords = intent.useCase
    ? USE_CASE_KEYWORDS[intent.useCase] || []
    : [];
  const genderKeywords = intent.gender
    ? GENDER_KEYWORDS[intent.gender] || []
    : [];
  const brandKeywords =
    intent.brand && intent.brand !== "unknown" ? [intent.brand] : [];

      const styleKeywords =
    intent.style &&
    STYLE_SYNONYMS[intent.style]
      ? STYLE_SYNONYMS[intent.style]
      : [];
  return [
    ...new Set(
      [
        ...queryKeywords,
        ...brandKeywords,
        ...categoryKeywords,
        ...useCaseKeywords,
        ...genderKeywords,
       ...styleKeywords, 

      ]
        .map((term) => normalizeText(term))
        .filter(Boolean),
    ),
  ].slice(0, 12);
};

export const buildProductSearchText = (product = {}) => {
  const parts = [
    product.productName,
    product.category,
    product.subCategory,
    product.brand,
    product.platform,
    product.gender,
    product.style,
    product.color,
    product.pattern,
    product.useCase,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ];

  return normalizeText(parts.filter(Boolean).join(" "));
};

export const inferStyleFromText = (text = "") => {
  const t = normalizeText(text);

  if (t.includes("oversized")) return "oversized";
  if (t.includes("korean")) return "korean";
  if (t.includes("old money")) return "old money";
  if (t.includes("streetwear")) return "streetwear";
  if (t.includes("minimal")) return "minimal";
  if (t.includes("coquette")) return "coquette";
  if (t.includes("y2k")) return "y2k";

  return null;
};
export const STYLE_SYNONYMS = {
  "old money": [
    "rich",
    "luxury",
    "classy",
    "elegant",
  ],

  streetwear: [
    "urban",
    "hype",
    "baggy",
  ],

  oversized: [
    "loose",
    "baggy",
  ],

  korean: [
    "k-style",
    "korean fashion",
  ],

  minimal: [
    "clean",
    "simple",
    "basic",
  ],
};



export const inferPatternFromText = (text = "") => {
  const t = normalizeText(text);

  if (t.includes("solid")) return "solid";
  if (t.includes("printed")) return "printed";
  if (t.includes("graphic")) return "graphic";
  if (t.includes("checked")) return "checked";
  if (t.includes("striped")) return "striped";

  return null;
};
export const normalizeIntent = (intent = {}, originalQuery = "") => {
  const normalizedQuery = normalizeText(originalQuery);
  const inferredCategory = inferCategoryFromText(
    
    [intent.category, intent.searchQuery, intent.searchTerms, originalQuery]
      .filter(Boolean)
      .join(" "),
  );
  const inferredUseCase = inferUseCaseFromText(
    [intent.useCase, intent.searchQuery, originalQuery]
      .filter(Boolean)
      .join(" "),
  );
  const inferredGender = inferGenderFromText(
    [intent.gender, intent.searchQuery, originalQuery]
      .filter(Boolean)
      .join(" "),
  );
  const inferredStyle = inferStyleFromText(
    [intent.style, intent.searchQuery, originalQuery].filter(Boolean).join(" "),
  );

  const inferredColor = inferColorFromText(
    [intent.color, intent.searchQuery, originalQuery].filter(Boolean).join(" "),
  );
  const keywords = extractSearchKeywords(
    intent.searchQuery || intent.searchTerms || originalQuery,
  );

  const category = ALLOWED_CATEGORIES.includes(intent.category)
    ? intent.category
    : inferredCategory;

  const gender = ALLOWED_GENDERS.includes(intent.gender)
    ? intent.gender
    : inferredGender;
  const useCase = ALLOWED_USE_CASES.includes(intent.useCase)
    ? intent.useCase
    : inferredUseCase;

  const rawBudget = Number(intent.budget);
  const budget =
    Number.isFinite(rawBudget) && rawBudget > 0
      ? rawBudget
      : extractBudgetFromText(originalQuery);

  const brand = normalizeText(intent.brand || "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    category: category || null,
    subCategory: intent.subCategory || null,
    brand: brand && brand !== "unknown" ? brand : "unknown",
    budget: budget || null,
    gender: gender || null,
    useCase: useCase || null,
   style: intent.style || inferredStyle || null,
color: intent.color || inferredColor || null,
pattern: intent.pattern || inferPatternFromText(originalQuery) || null,
    searchQuery: keywords.join(" "),
    keywords,
    originalQuery: normalizedQuery,
  };
};

export const inferColorFromText = (text = "") => {
  const t = normalizeText(text);

  const colors = [
    "black",
    "white",
    "blue",
    "red",
    "green",
    "yellow",
    "pink",
    "grey",
    "gray",
    "brown",
    "beige",
    "purple",
    "orange",
    "navy",
  ];

  return colors.find((color) => t.includes(color)) || null;
};

export const getIntentCacheKey = (message = "") =>
  `intent:${normalizeText(message)}`;

export const getSearchCacheKey = (intent = {}, message = "") => {
  const normalized = normalizeIntent(intent, message);
  const keyParts = [
    normalized.category,
    normalized.subCategory,
    normalized.brand,
    normalized.budget || "na",
    normalized.gender || "na",
    normalized.useCase || "na",
     normalized.style || "na",
  normalized.color || "na",
  normalized.pattern || "na",
    normalized.searchQuery || "na",
  ];

  return `search:${keyParts.join(":")}`;
};

export const isNonEmptyArray = (value) =>
  Array.isArray(value) && value.length > 0;

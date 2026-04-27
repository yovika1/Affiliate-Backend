import { normalizeText } from "./searchHelpers.js";

const UNSUPPORTED_KEYWORDS = [
  "shoe",
  "sneaker",
  "loafer",
  "heel",
  "slipper",
  "lipstick",
  "lip gloss",
  "lip balm",
  "foundation",
  "concealer",
  "compact",
  "mascara",
  "eyeliner",
  "kajal",
  "blush",
  "highlighter",
  "makeup",
  "face wash",
  "cleanser",
  "moisturizer",
  "cream",
  "lotion",
  "serum",
  "sunscreen",
  "spf",
  "scrub",
  "cargo",
  "jogger",
  "track pant",
  "trackpants",
  "pant",
  "pants",
  "lower",
  "night suit",
  "pyjama",
  "pajama",
  "track suit",
  "tracksuit",
  "kurta",
];

export const isUnsupportedProduct = (name = "") => {
  const normalized = normalizeText(name);
  return UNSUPPORTED_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

// ==========================
// CATEGORY DETECTOR
// ==========================
export const detectCategory = (name) => {
  const n = normalizeText(name);

  if (isUnsupportedProduct(n)) return null;

  if (n.includes("tshirt") || n.includes("tee")) return "tshirt";
  if (n.includes("shirt") || n.includes("polo")) return "shirt";
  if (n.includes("jeans") || n.includes("denim")) return "jeans";
  if (n.includes("dress") || n.includes("gown")) return "dress";

  return "tshirt";
};

export const extractExtraTags = (name) => {
  const n = name.toLowerCase();
  const tags = [];

  if (n.includes("oversized")) tags.push("oversized");
  if (n.includes("printed")) tags.push("printed");
  if (n.includes("solid")) tags.push("solid");
  if (n.includes("denim")) tags.push("denim");
  if (n.includes("formal")) tags.push("formal");

  return tags;
};


export const buildSearchableText = (p, category, brand) => {
  const extraTags = extractExtraTags(p.productName);

  return normalizeText(
    `${p.productName} ${category} ${brand} ${p.gender || ""} ${p.useCase || "casual"} ${extraTags.join(" ")}`
  );
};

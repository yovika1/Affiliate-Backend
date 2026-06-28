import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  inferCategoryFromText,
  inferGenderFromText,
  inferUseCaseFromText,
  normalizeIntent,
  inferStyleFromText,
  normalizeText,
} from "../Utils/searchHelpers.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const TRANSIENT_ERROR_DELAY_MS = 1200;
const AI_COOLDOWN_MS = 60 * 1000;

let genAI = null;
let chatModel = null;
let embeddingModel = null;
let hasLoggedMissingApiKey = false;
let aiDisabledUntil = 0;

const now = () => Date.now();

const isAiTemporarilyDisabled = () => aiDisabledUntil > now();

const disableAiTemporarily = (ms = AI_COOLDOWN_MS) => {
  aiDisabledUntil = Math.max(aiDisabledUntil, now() + ms);
};

const isQuotaOrAvailabilityError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("not supported") ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand")
  );
};

const isRetryableAiError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    isQuotaOrAvailabilityError(error) ||
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("fetch")
  );
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getChatModel = () => {
  if (isAiTemporarilyDisabled()) return null;
  if (chatModel) return chatModel;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (!hasLoggedMissingApiKey) {
      hasLoggedMissingApiKey = true;
      console.warn("[intent] GEMINI_API_KEY is missing, using local fallbacks");
    }
    return null;
  }

  genAI = genAI || new GoogleGenerativeAI(apiKey);
  chatModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  return chatModel;
};

const getEmbeddingModel = () => {
  if (isAiTemporarilyDisabled()) return null;
  if (embeddingModel) return embeddingModel;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  genAI = genAI || new GoogleGenerativeAI(apiKey);
  embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  return embeddingModel;
};

const stripCodeFences = (text = "") =>
  text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

const extractJSON = (text = "") => {
  try {
    const cleaned = stripCodeFences(text);
    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

const buildHeuristicIntent = (query = "") => { 
    const inferredSubCategory =
    inferCategoryFromText(query);

  const category =
    ["makeup", "skincare", "perfume",]
      .includes(inferredSubCategory)
      ? "beauty"
      : inferredSubCategory
        ? "fashion"
        : "general";

 return normalizeIntent(
    {

      category,
      subCategory: inferredSubCategory,
      gender: inferGenderFromText(query),
      useCase: inferUseCaseFromText(query),
          style: inferStyleFromText(query),
      brand: "unknown",
      budget: null,
      searchQuery: query,
    },
    query,
  );
}

const formatCurrency = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value))
    return "Price unavailable";
  return `Rs.${Math.round(value)}`;
};

const buildProductReason = (product = {}) => {
  const reasons = [];

  if (product.brand && product.brand !== "unknown") reasons.push(product.brand);
  if (product.useCase) reasons.push(product.useCase);
  if (typeof product.rating === "number")
    reasons.push(`${product.rating.toFixed(1)} rating`);

  return reasons.length ? reasons.join(" | ") : "good match for your search";
};

const buildLocalAssistantReply = (products = []) => {
  if (!products.length) {
    return "I could not find a strong match yet. Try adding a category, brand, budget, or occasion and I will narrow it down.";
  }

  const topProducts = products.slice(0, 3);
  const lines = topProducts.map(
    (product, index) =>
      `${index + 1}. ${product.productName} (${formatCurrency(product.currentPrice)}) - ${buildProductReason(product)}`,
  );

  return `Here are a few strong picks:\n${lines.join("\n")}`;
};

const normalizeOutfitPiece = (value, fallback) =>
  inferCategoryFromText(value || "") || fallback;

const generateText = async (
  prompt,
  { label = "ai", allowRetry = true } = {},
) => {
  const model = getChatModel();
  if (!model) return null;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text()?.trim() || null;
  } catch (error) {
    if (
      allowRetry &&
      isRetryableAiError(error) &&
      !isQuotaOrAvailabilityError(error)
    ) {
      await wait(TRANSIENT_ERROR_DELAY_MS);
      return generateText(prompt, { label, allowRetry: false });
    }

    if (isQuotaOrAvailabilityError(error)) {
      disableAiTemporarily();
    }

    console.error(`[${label}] Error:`, error.message);
    return null;
  }
};

export const detectIntentAI = async (query) => {
  const fallbackIntent = buildHeuristicIntent(query);

  const prompt = `
Extract shopping intent from this query:

"${query}"

Return STRICT JSON only:
{
  "category": "",
  "subCategory": "",
  "brand": "",
  "budget": 0,
  "gender": "",
    "style": "",
  "color": "",
  "pattern": "",
  "useCase": "",
  "searchQuery": ""
}

Rules:
- category must be one of:

fashion,
beauty,
general

subCategory:
dresses,
jeans,
shirt,
tshirt,
kurta,
makeup,
skincare,
perfume,
makeup spray,

- gender should be:
  men,
  women,
  null

- useCase should be:
  casual,
  formal,
  college,
  party,
  office,
  travel,
  wedding,
  gym

 - pattern should be:
solid,
printed,
checked,
striped,
graphic,
null

- style should be:
  oversized,
  korean,
  old money,
  streetwear,
  minimal,
  coquette,
  y2k,
  ethnic,
  null

- color should contain requested color or null
- searchQuery should be short helpful keywords
`;

  const text = await generateText(prompt, { label: "intent" });

  if (!text) return fallbackIntent;

  const parsed = extractJSON(text);
  return normalizeIntent(parsed || fallbackIntent, query);
};

export const generateEmbedding = async (text) => {
  try {
    const cleanedText = normalizeText(text);

    if (!cleanedText) {
      return [];
    }

    const model = getEmbeddingModel();
    if (!model) return [];

    const result = await model.embedContent({
      content: {
        parts: [{ text: cleanedText }],
      },
    });

    const vector = result?.embedding?.values || [];
    if (!vector.length) {
      return [];
    }

    return vector;
  } catch (err) {
    if (isQuotaOrAvailabilityError(err)) {
      disableAiTemporarily();
    }
    console.error("[embedding] Error:", err.message);
    return [];
  }
};

export const generateAssistantReply = async (history, products) => {
  const fallbackReply = buildLocalAssistantReply(products);

  const productSummary = products
    .slice(0, 5)
    .map(
      (product, index) =>
        `${index + 1}. ${product.productName} | ${buildProductReason(product)}`
    )
    .join("\n");

  const prompt = `
You are Rangyblux AI Stylist, a fashion and beauty shopping assistant.

Conversation:
${history.map((entry) => `${entry.role}: ${entry.content}`).join("\n")}

Available products:
${productSummary || "No products found"}

Rules:
- Reply in a friendly, stylish and concise tone.
- Start with a 1-line recommendation.
- Then recommend up to 3 products.
- Always mention the product names exactly as provided.
- For each product, explain in one short sentence why it suits the user's request.
- Use bullets instead of long paragraphs.
- Do NOT mention prices.
- Do NOT invent products that are not in the available products list.
- End with one short styling tip.
- If there are no matching products, ask one helpful follow-up question.
`;

  const text = await generateText(prompt, { label: "reply" });
  return text || fallbackReply;
};

export const isOutfitQuery = (query = "") => {
  const normalized = normalizeText(query);
  const keywords = [
    "outfit",
    "what to wear",
    "what should i wear",
    "what should i wear for",
    "complete look",
    "pair with",
    "style this",
    "style me",
    "full look",
    "help me dresses",
  ];

  if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
    return true;
  }

  return (
    normalized.includes("wear for") ||
    normalized.includes("wear to") ||
    normalized.includes("look for")
  );
};

export const generateOutfitReply = async (structure, outfit) => {
  const top =
  outfit.top?.map(
    p => `${p.productName} (${p.gender || ""}, ${p.category || ""})`
  ).join("\n") || "";

  const bottom =
  outfit.bottom?.map(
    p => `${p.productName} (${p.gender || ""}, ${p.category || ""})`
  ).join("\n") || "";

  const makeup =
  outfit.makeup?.map(
    p => `${p.productName} (${p.category || ""})`
  ).join("\n") || "";

  const prompt = `
You are Rangyblux AI Stylist.

The product cards below will already show images, prices and buttons.
Do NOT repeat that information.

Detected Outfit:

Style: ${structure.style}
Occasion: ${structure.occasion}
Gender: ${structure.gender}

Available Products:

Top:
${top || "None"}

Bottom:
${bottom || "None"}

Beauty:
${makeup || "None"}

Rules:

- Sound like a premium fashion stylist.
- Never invent products.
- Mention only available products.
- Mention every product name only once.
- Never mention prices.
- Keep the reply under 80 words.
- Use bullets.

Very Important:

- Never mix men's and women's products.
- If Gender = women, recommend only women's products.
- If Gender = men, recommend only men's products.
- If a product name contains "Men" and gender is women, ignore it.
- If a product name contains "Women" and gender is men, ignore it.
Format:

✨ <Style Name>

• <Product Name> — short reason

• <Product Name> — short reason

${
  makeup
    ? "• <Beauty Product> — short reason"
    : ""
}

Why it works:
One short sentence.

Styling Tip:
One short sentence.
`;

  return await generateText(prompt, {
    label: "outfitReply",
  });
};

export const generateOutfitStructure = async (query) => {
 
  const normalized = normalizeText(query);

  const isMen = /men|male|boy|guy/.test(normalized);
  const gender = isMen ? "men" : "women";

  let top = inferCategoryFromText(query);
  let bottom = null;

  // Occasion based defaults
  if (!top) {
    if (/wedding|reception|engagement/.test(normalized)) {
      top = gender === "women" ? "dresses" : "kurta";
    } else if (/party/.test(normalized)) {
      top = gender === "women" ? "dresses" : "shirt";
    } else if (/office|formal/.test(normalized)) {
      top = "blazer";
    } else if (/college|campus/.test(normalized)) {
      top = "tshirt";
    } else if (/gym/.test(normalized)) {
      top = "tshirt";
    } else {
      top = "tshirt";
    }
  }

  if (top === "dresses") {
    bottom = null;
  } else if (/party|office|formal/.test(normalized)) {
    bottom = gender === "women" ? "skirt" : "trousers";
  } else {
    bottom = "jeans";
  }

  const fallback = {
    gender,
    top,
    bottom,
    occasion: inferUseCaseFromText(query) || "casual",
    style: inferStyleFromText(query),
    colorPalette: null,
    makeupLook: gender === "women" ? "natural" : "none",
  };

  const prompt = `
Create outfit structure for:

"${query}"

Return STRICT JSON only:

{
"gender": "",
  "top": "",
  "bottom": "",
  "occasion": "",
  "style": "",
  "colorPalette": "",
  "makeupLook": ""
}

Rules:

- gender:
men,
women

- top can be:
tshirt,
shirt,
kurta,
dresses,
blazer

- bottom can be:
jeans,
trousers,
skirt,
shorts,
null

- occasion:
casual,
formal,
party,
college,
wedding,
travel,
gym

- style:
oversized,
korean,
old money,
streetwear,
minimal,
coquette,
y2k,
ethnic

- colorPalette:
neutral,
black-white,
earth-tone,
pastel,
monochrome,
bright

- makeupLook:
natural,
glam,
soft-glam,
dewy,
bold,
minimal,
none

Important:

- For men outfits always set makeupLook = "none"
- Only suggest makeupLook for women outfits
`
;
  const text = await generateText(prompt, { label: "outfit" });
  if (!text) return fallback;

  const parsed = extractJSON(text) || {};
  return {
     gender:
    parsed.gender ||
    fallback.gender,
    top: normalizeOutfitPiece(parsed.top, fallback.top),
    bottom: normalizeOutfitPiece(parsed.bottom, fallback.bottom),
    occasion: inferUseCaseFromText(parsed.occasion || "") || fallback.occasion,
    style:
    parsed.style ||
    fallback.style ||
    null,

  colorPalette:
    parsed.colorPalette ||
    fallback.colorPalette ||
    null,

  makeupLook:
    parsed.makeupLook ||
    fallback.makeupLook ||
    null,

  };
};

export const isAiCoolingDown = () => isAiTemporarilyDisabled();

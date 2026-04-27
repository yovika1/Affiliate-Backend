import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  inferCategoryFromText,
  inferGenderFromText,
  inferUseCaseFromText,
  normalizeIntent,
  normalizeText,
} from "../utils/searchHelpers.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const EMBEDDING_MODEL = "embedding-001";
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
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

const extractJSON = (text = "") => {
  try {
    const cleaned = stripCodeFences(text);
    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

const buildHeuristicIntent = (query = "") =>
  normalizeIntent(
    {
      category: inferCategoryFromText(query),
      gender: inferGenderFromText(query),
      useCase: inferUseCaseFromText(query),
      brand: "unknown",
      budget: null,
      searchQuery: query,
    },
    query,
  );

const formatCurrency = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Price unavailable";
  return `Rs.${Math.round(value)}`;
};

const buildProductReason = (product = {}) => {
  const reasons = [];

  if (product.brand && product.brand !== "unknown") reasons.push(product.brand);
  if (product.useCase) reasons.push(product.useCase);
  if (typeof product.rating === "number") reasons.push(`${product.rating.toFixed(1)} rating`);

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

const generateText = async (prompt, { label = "ai", allowRetry = true } = {}) => {
  const model = getChatModel();
  if (!model) return null;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text()?.trim() || null;
  } catch (error) {
    if (allowRetry && isRetryableAiError(error) && !isQuotaOrAvailabilityError(error)) {
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
  "brand": "",
  "budget": 0,
  "gender": "",
  "useCase": "",
  "searchQuery": ""
}

Rules:
- category must be one of: tshirt, shirt, jeans, dress
- brand should be "unknown" if missing
- budget should be the maximum user budget, else null
- gender should be "men", "women", or null
- useCase should be "casual", "formal", "gym", "party", "college", or null
- searchQuery should be short helpful keywords
`;

  console.log("[intent] Detecting intent with AI", { query });
  const text = await generateText(prompt, { label: "intent" });

  if (!text) return fallbackIntent;

  console.log("[intent] Raw AI response", text);
  const parsed = extractJSON(text);
  return normalizeIntent(parsed || fallbackIntent, query);
};

export const generateEmbedding = async (text) => {
  try {
    const cleanedText = normalizeText(text);
    console.log("[embedding] Generating embedding", { text: cleanedText });

    if (!cleanedText) {
      console.log("[embedding] Empty text");
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
      console.log("[embedding] Empty vector returned");
      return [];
    }

    console.log("[embedding] Success", { dimensions: vector.length });
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
        `${index + 1}. ${product.productName} | ${formatCurrency(product.currentPrice)} | ${buildProductReason(product)}`,
    )
    .join("\n");

  const prompt = `
You are a helpful shopping assistant.

Conversation:
${history.map((entry) => `${entry.role}: ${entry.content}`).join("\n")}

Top products:
${productSummary || "No products found"}

Task:
- Reply in a friendly, concise tone.
- Recommend up to 3 products with short reasons.
- If there are no products, ask one helpful follow-up question.
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
    "help me dress",
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

export const generateOutfitStructure = async (query) => {
  const fallback = {
    top: inferCategoryFromText(query) || "tshirt",
    bottom: /dress/i.test(query) ? null : "jeans",
    occasion: inferUseCaseFromText(query) || "casual",
  };

  const prompt = `
Create outfit structure for:

"${query}"

Return STRICT JSON only:
{
  "top": "",
  "bottom": "",
  "occasion": ""
}

Rules:
- top must be one of: tshirt, shirt, dress
- bottom must be "jeans" or null
- occasion should be one of: casual, formal, gym, party, college
`;

  const text = await generateText(prompt, { label: "outfit" });
  if (!text) return fallback;

  const parsed = extractJSON(text) || {};
  return {
    top: normalizeOutfitPiece(parsed.top, fallback.top),
    bottom: normalizeOutfitPiece(parsed.bottom, fallback.bottom),
    occasion: inferUseCaseFromText(parsed.occasion || "") || fallback.occasion,
  };
};

export const isAiCoolingDown = () => isAiTemporarilyDisabled();

import {
  detectIntentAI,
  generateAssistantReply,
  generateOutfitReply,
  generateOutfitStructure,
  isOutfitQuery,
} from "../services/intentService.js";
import {
  getAffiliateLink,
  getAffiliateCacheKey,
} from "../services/affiliateService.js";
import { fetchOutfitProducts } from "../services/outfitService.js";
import { searchProducts } from "../services/searchService.js";
import {
  getSessionHistory,
  saveSessionHistory,
} from "../services/chatMemory.js";
import { getCache, setCache } from "../Utils/redisClient.js";
import {
  getIntentCacheKey,
  getSearchCacheKey,
  isNonEmptyArray,
  normalizeIntent,
  normalizeText,
} from "../Utils/searchHelpers.js";

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 500;
const CACHE_TTL = {
  intent: 60 * 60,
  search: 60 * 10,
  affiliate: 60 * 60 * 24,
  reply: 60 * 20,
};

const safeParse = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const normalizeSessionId = (value = "") =>
  String(value)
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 120);

const getReplyCacheKey = (message = "", products = []) => {
  const productKey = products
    .slice(0, 5)
    .map((product) =>
      [product._id, product.category, product.currentPrice]
        .filter(Boolean)
        .join("-"),
    )
    .join("|");

  return `reply:${normalizeText(message)}:${productKey || "no-products"}`;
};

const attachAffiliateLinks = async (products = []) =>
  Promise.all(
    products.map(async (product) => {
      const cacheKey = getAffiliateCacheKey(product);
      let link = cacheKey ? await getCache(cacheKey) : null;

      if (!link) {
        link = await getAffiliateLink(product);
        if (cacheKey && link) {
          await setCache(cacheKey, link, CACHE_TTL.affiliate);
        }
      }

      return {
        ...(product.toObject ? product.toObject() : product),
        affiliateLink: link || product.affiliateUrl || product.productUrl || "",
      };
    }),
  );

export const chatHandler = async (req, res) => {
  try {
    const sessionId = normalizeSessionId(req.body?.sessionId);
    const cleanMessage =
      typeof req.body?.message === "string"
        ? req.body.message.trim().slice(0, MAX_MESSAGE_LENGTH)
        : "";
    // console.log("Is Outfit Query:", isOutfitQuery(cleanMessage));
    if (!sessionId || !cleanMessage) {
      return res.status(400).json({
        error: "sessionId and message required",
      });
    }

    let history = await getSessionHistory(sessionId);
    history = Array.isArray(history) ? history : [];
    history.push({ role: "user", content: cleanMessage });
    history = history.slice(-MAX_HISTORY);

    if (isOutfitQuery(cleanMessage)) {
      const structure = await generateOutfitStructure(cleanMessage);
      const outfit = await fetchOutfitProducts(structure, cleanMessage);
      const outfitWithLinks = {};
      const formatText = (text = "") =>
        text
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      for (const [key, item] of Object.entries(outfit)) {
        if (!item) continue;

        if (Array.isArray(item)) {
          const resolvedItems = await attachAffiliateLinks(item);
          if (resolvedItems.length) {
            outfitWithLinks[key] = resolvedItems;
          }
          continue;
        }

        const [resolved] = await attachAffiliateLinks([item]);
        outfitWithLinks[key] = resolved;
      }

      const hasPieces = Object.keys(outfitWithLinks).length > 0;

      let reply = "";

      if (hasPieces) {
        reply = await generateOutfitReply(structure, outfitWithLinks);

        if (!reply) {
          reply = `✨ ${formatText(structure.style || "Stylish")} Look

       I found a few matching pieces for your ${
            structure.occasion || "casual"
          } outfit. Check out the product cards below.`;
        }
      } else {
        reply =
          "I understood your outfit request, but I couldn't find matching products yet.";
      }

      history.push({ role: "assistant", content: reply });
      await saveSessionHistory(sessionId, history);

      return res.json({
        message: reply,
        outfit: outfitWithLinks,
      });
    }

    const normalizedMessage = cleanMessage.toLowerCase();
    const intentCacheKey = getIntentCacheKey(normalizedMessage);

    let intent = await getCache(intentCacheKey);
    intent = intent ? safeParse(intent) : null;

    if (!intent) {
      intent = await detectIntentAI(cleanMessage);
      await setCache(intentCacheKey, JSON.stringify(intent), CACHE_TTL.intent);
    } else {
    }

    intent = normalizeIntent(intent, cleanMessage);

    const searchCacheKey = getSearchCacheKey(intent, normalizedMessage);

    let products = await getCache(searchCacheKey);
    products = products ? safeParse(products) : null;

    if (!products) {
      try {
        products = await searchProducts(intent, cleanMessage);
      } catch (err) {
        console.error("[chat] Search failed:", err.message);
        products = [];
      }

      if (isNonEmptyArray(products)) {
        await setCache(
          searchCacheKey,
          JSON.stringify(products),
          CACHE_TTL.search,
        );
      }
    }

    products = (products || []).slice(0, 10);
    const results = await attachAffiliateLinks(products);
    const replyCacheKey = getReplyCacheKey(cleanMessage, results);

    let assistantReply = results.length ? await getCache(replyCacheKey) : null;

    assistantReply = typeof assistantReply === "string" ? assistantReply : null;

    if (!assistantReply) {
      assistantReply = results.length
        ? await generateAssistantReply(history, results)
        : "I could not find a strong match yet. Try adding a brand, budget, color, or occasion and I will narrow it down.";

      if (results.length && assistantReply) {
        await setCache(replyCacheKey, assistantReply, CACHE_TTL.reply);
      }
    }

    history.push({ role: "assistant", content: assistantReply });
    await saveSessionHistory(sessionId, history);

    return res.json({
      message: assistantReply,
      intent,
      products: results,
      fallbackMessage: results.length ? null : "No close matches found yet.",
    });
  } catch (err) {
    console.error("[chat] ERROR:", err);

    return res.status(500).json({
      message: "Sorry, something went wrong while searching.",
      intent: null,
      products: [],
      fallbackMessage: null,
      error: err.message,
    });
  }
};

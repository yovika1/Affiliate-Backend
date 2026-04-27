import axios from "axios";
import { getCache, setCache } from "../utils/redisClient.js";

const APPROVED = process.env.CUELINKS_APPROVED === "true";
const CUELINKS_API = process.env.CUELINKS_API;
const CUELINKS_TOKEN = process.env.CUELINKS_TOKEN;
const AFFILIATE_TTL = 7 * 24 * 60 * 60;

export const getAffiliateCacheKey = (product = {}) => {
  if (product._id) return `aff:${product._id}`;
  if (product.productUrl) return `aff:url:${product.productUrl}`;
  if (product.affiliateUrl) return `aff:direct:${product.affiliateUrl}`;
  return null;
};

const getBaseDestinationUrl = (product = {}) =>
  product.affiliateUrl || product.productUrl || "";

export const getAffiliateLink = async (product = {}) => {
  try {
    const cacheKey = getAffiliateCacheKey(product);
    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return cached;
    }

    const baseUrl = getBaseDestinationUrl(product);
    if (!baseUrl) return "";

    let finalLink = baseUrl;

    if (product.affiliateType === "earnkaro" && product.affiliateUrl) {
      finalLink = product.affiliateUrl;
    } else if (APPROVED && CUELINKS_API && CUELINKS_TOKEN && product.productUrl) {
      try {
        const res = await axios.post(
          CUELINKS_API,
          { url: product.productUrl },
          {
            headers: {
              Authorization: `Bearer ${CUELINKS_TOKEN}`,
            },
            timeout: 5000,
          },
        );

        if (res?.data?.affiliate_url) {
          finalLink = res.data.affiliate_url;
        }
      } catch (error) {
        console.log("[affiliate] API error:", error.message);
      }
    }

    if (cacheKey) {
      await setCache(cacheKey, finalLink, AFFILIATE_TTL);
    }

    return finalLink;
  } catch (err) {
    console.error("[affiliate] Service error:", err.message);
    return getBaseDestinationUrl(product);
  }
};

import axios from "axios";
import * as cheerio from "cheerio";

export const fetchProductPrice = async (url) => {
    console.log("🔥 FUNCTION CALLED WITH URL:", url);

  try {
    // 👉 Force mobile version (more stable HTML)
    if (url.includes("flipkart.com") && !url.includes("m.flipkart.com")) {
      url = url.replace("https://www.flipkart.com", "https://m.flipkart.com");
    }

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Accept-Language": "en-IN,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        Referer: "https://www.google.com/",
      },
      timeout: 15000,
    });
// 👇 YAHAN lagao
    console.log("===== RAW HTML START =====");
    console.log(data.substring(0, 1500));
    console.log("===== RAW HTML END =====");
    const $ = cheerio.load(data);

    let productName = null;
    let imageUrl = null;
    let currentPrice = null;
    let originalPrice = null;
    let rating = null;
    let reviewsCount = null;
    let discountPercent = null;

    // -----------------------------------
    // 1️⃣ UNIVERSAL JSON-LD EXTRACTION
    // -----------------------------------
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());

        if (json["@type"] === "Product") {
          productName = json.name || productName;
          imageUrl = Array.isArray(json.image)
            ? json.image[0]
            : json.image || imageUrl;

          if (json.offers) {
            currentPrice = Number(json.offers.price) || currentPrice;
            originalPrice =
              Number(json.offers.highPrice) ||
              Number(json.offers.price) ||
              originalPrice;
          }

          if (json.aggregateRating) {
            rating = Number(json.aggregateRating.ratingValue);
            reviewsCount = Number(json.aggregateRating.reviewCount);
          }
        }
      } catch {}
    });

    // -----------------------------------
    // 2️⃣ FLIPKART SPECIFIC EXTRACTION
    // -----------------------------------
    if (url.includes("flipkart.com")) {
      // Try __INITIAL_STATE__ (most powerful)
      const stateMatch = data.match(
        /window\.__INITIAL_STATE__\s*=\s*({.*?});/
      );

      if (stateMatch) {
        try {
          const stateData = JSON.parse(stateMatch[1]);
          const productData =
            stateData?.product?.product ||
            stateData?.pageData?.product ||
            null;

          if (productData) {
            productName = productData.title || productName;
            imageUrl =
              productData.images?.[0]?.url || imageUrl;

            if (productData.price) {
              currentPrice =
                Number(productData.price?.sellingPrice) ||
                currentPrice;
              originalPrice =
                Number(productData.price?.mrp) ||
                originalPrice;
            }

            rating =
              productData.rating?.average || rating;
            reviewsCount =
              productData.rating?.count || reviewsCount;
          }
        } catch {}
      }

      // Fallback selectors (mobile version friendly)
      if (!productName)
        productName =
          $("h1").first().text().trim() ||
          $('meta[property="og:title"]').attr("content");

      if (!imageUrl)
        imageUrl =
          $('meta[property="og:image"]').attr("content") ||
          $("img").first().attr("src");

      if (!currentPrice) {
        const priceMeta =
          $('meta[property="product:price:amount"]').attr(
            "content"
          );
        if (priceMeta) currentPrice = Number(priceMeta);
      }
    }

    // -----------------------------------
    // 3️⃣ UNIVERSAL FALLBACK
    // -----------------------------------
    if (!productName)
      productName =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text().trim() ||
        "Unknown Product";

    if (!imageUrl)
      imageUrl =
        $('meta[property="og:image"]').attr("content") ||
        "";

    if (!originalPrice) originalPrice = currentPrice;

    // -----------------------------------
    // 4️⃣ DISCOUNT CALCULATION
    // -----------------------------------
    if (
      originalPrice &&
      currentPrice &&
      originalPrice > currentPrice
    ) {
      discountPercent = Math.round(
        ((originalPrice - currentPrice) /
          originalPrice) *
          100
      );
    }

    return {
      productName,
      imageUrl,
      currentPrice,
      originalPrice,
      discountPercent,
      rating,
      reviewsCount,
    };
  } catch (error) {
    console.log("❌ Scraper Error:", error.message);

    return {
      productName: "Unknown Product",
      imageUrl: "",
      currentPrice: null,
      originalPrice: null,
      discountPercent: null,
      rating: null,
      reviewsCount: null,
    };
  }
};
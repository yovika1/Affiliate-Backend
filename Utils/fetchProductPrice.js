import axios from "axios";
import * as cheerio from "cheerio";

export const fetchProductPrice = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        "Accept-Language": "en-IN,en;q=0.9",
      },
    });

    const $ = cheerio.load(data);

    let productName = "";
    let imageUrl = "";
    let currentPrice = null;
    let originalPrice = null;

    // -------------------------------
    // 1. Universal JSON-LD Extraction
    // -------------------------------
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());

        if (json.name) productName = json.name;
        if (json.image) imageUrl = json.image;

        if (json.offers) {
          if (!currentPrice && json.offers.price)
            currentPrice = Number(json.offers.price);
          if (!originalPrice && json.offers.highPrice)
            originalPrice = Number(json.offers.highPrice);
          if (!currentPrice && json.offers.lowPrice)
            currentPrice = Number(json.offers.lowPrice);
        }
      } catch {}
    });

    // -------------------------------
    // 2. Flipkart Scraper
    // -------------------------------
    if (url.includes("flipkart.com")) {
      if (!productName)
        productName =
          $("span.B_NuCI").text().trim() ||
          $('meta[property="og:title"]').attr("content") ||
          $("title").text().trim();

      if (!imageUrl)
        imageUrl =
          $("img._396cs4").attr("src") ||
          $("img._2r_T1I").attr("src") ||
          $('meta[property="og:image"]').attr("content") ||
          "";

      // Current Price
      const flipkartPriceSelectors = [
        "._30jeq3._16Jk6d", 
        ".Nx9bqj.CxhGGd",
        ".hZ3P6w", 
        "[class*='price']",
      ];

      for (const sel of flipkartPriceSelectors) {
        const txt = $(sel).first().text().replace(/[^0-9]/g, "");
        if (txt) {
          currentPrice = Number(txt);
          break;
        }
      }

      // Original Price
      const flipkartOriginalSelectors = [
        "._3I9_wc._2p6lqe",
        ".kRYCnD",
        "del",
        "span[class*='MRP']",
      ];

      for (const sel of flipkartOriginalSelectors) {
        const txt = $(sel).first().text().replace(/[^0-9]/g, "");
        if (txt) {
          originalPrice = Number(txt);
          break;
        }
      }
    }

    if (!productName)
      productName =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text().trim() ||
        "Unknown Product";

    if (!imageUrl)
      imageUrl =
        $('meta[property="og:image"]').attr("content") ||
        "";

    if (!currentPrice) {
      const priceMeta =
        $('meta[itemprop="price"]').attr("content") ||
        $('meta[property="product:price:amount"]').attr("content");
      if (priceMeta) currentPrice = Number(priceMeta);
    }

    if (!originalPrice) originalPrice = currentPrice;

    return {
      productName,
      imageUrl,
      currentPrice,
      originalPrice,
    };
  } catch (error) {
    console.log("❌ Scraper Error:", error.message);
    return {
      productName: "Unknown Product",
      imageUrl: "",
      currentPrice: null,
      originalPrice: null,
    };
  }
};

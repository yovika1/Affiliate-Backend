import axios from "axios";
import * as cheerio from "cheerio";

export const fetchProductPrice = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    let productName = "";
    let imageUrl = "";
    let currentPrice = null;
    let originalPrice = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json.name && !productName) productName = json.name;
        if (json.image && !imageUrl) imageUrl = json.image;
        if (json.offers) {
          if (json.offers.price && !currentPrice)
            currentPrice = Number(json.offers.price);
          if (json.offers.highPrice && !originalPrice)
            originalPrice = Number(json.offers.highPrice);
          if (json.offers.lowPrice && !currentPrice)
            currentPrice = Number(json.offers.lowPrice);
        }
      } catch {}
    });

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

      if (!currentPrice) {
        const priceSelectors = [
          "div.Nx9bqj.CxhGGd",
          "div._30jeq3._16Jk6d",
          "div._25b18c > div:first-child",
        ];
        for (const sel of priceSelectors) {
          const txt = $(sel).first().text().replace(/[^0-9]/g, "");
          if (txt) {
            currentPrice = Number(txt);
            break;
          }
        }
      }

      if (!originalPrice) {
        const origSelectors = [
          "div.yRaY8j.A6\\+E6v",
          "div._3I9_wc._2p6lqe",
          "div._3I9_wc",
          "div._25b18c > div:nth-child(2)",
        ];
        for (const sel of origSelectors) {
          const txt = $(sel).first().text().replace(/[^0-9]/g, "");
          if (txt) {
            originalPrice = Number(txt);
            break;
          }
        }
      }
    }

    // 🛍️ Meesho scraping (fallback)
    else if (url.includes("meesho.com")) {
      if (!productName)
        productName =
          $("h1").first().text().trim() ||
          $('meta[property="og:title"]').attr("content");

      if (!imageUrl)
        imageUrl =
          $("img[src*='images.meesho.com']").attr("src") ||
          $('meta[property="og:image"]').attr("content") ||
          "";

      if (!currentPrice) {
        const txt =
          $("h4").text().replace(/[^0-9]/g, "") ||
          $(
            "span.Text__StyledText-sc-ap21c8-0.Price__DiscountedPrice-sc-pldi2d-0"
          )
            .text()
            .replace(/[^0-9]/g, "");
        if (txt) currentPrice = Number(txt);
      }

      if (!originalPrice) {
        const txt =
          $("span.line-through").text().replace(/[^0-9]/g, "") ||
          $(
            "span.Text__StyledText-sc-ap21c8-0.Price__RetailPrice-sc-pldi2d-1"
          )
            .text()
            .replace(/[^0-9]/g, "");
        if (txt) originalPrice = Number(txt);
      }
    }

    // 🌐 Generic fallback for any other site
    if (!productName)
      productName =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text().trim() ||
        "Unknown Product";

    if (!imageUrl)
      imageUrl =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        "";

    if (!currentPrice) {
      const metaPrice =
        $('meta[property="product:price:amount"]').attr("content") ||
        $('meta[itemprop="price"]').attr("content") ||
        $('meta[name="price"]').attr("content") ||
        null;
      if (metaPrice) currentPrice = Number(metaPrice);
    }

    if (!originalPrice) originalPrice = currentPrice;

    return {
      productName: productName?.trim() || "Unknown Product",
      imageUrl: imageUrl?.trim() || "",
      currentPrice: currentPrice || null,
      originalPrice: originalPrice || null,
    };
  } catch (error) {
    console.error("❌ Error fetching product details:", error.message);
    return {
      productName: "Unknown Product",
      imageUrl: "",
      currentPrice: null,
      originalPrice: null,
    };
  }
};

import { detectIntent } from "../services/intentService.js";
import { searchProducts } from "../services/productService.js";
import { generateReply } from "../services/aiService.js";
import { buildOutfit } from "../services/outfitBuilder.js";

export const chatWithAI = async (req, res) => {
  try {

    const { message } = req.body;

    const intent = detectIntent(message);

    let products = [];

    if (intent === "outfit_builder") {

 const outfitResult = await buildOutfit();
  products = outfitResult.products;
    } else {

      products = await searchProducts(message);

    }

    let fallbackMessage = null;

    if (!products || products.length === 0) {

      const keyword = message.split(" ").pop();

      products = await searchProducts(keyword);

      fallbackMessage =
        `I couldn't find an exact "${message}" right now, but here are some similar styles you might like.`;

    }

    const reply = await generateReply(message, products, intent);

    res.json({
      intent,
      reply,
      products,
      fallbackMessage
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "AI error"
    });

  }
};
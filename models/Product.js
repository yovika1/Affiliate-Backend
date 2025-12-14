import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    productUrl: { type: String, required: true },

    currentPrice: { type: Number, default: null },
    originalPrice: { type: Number, default: null },
    discount: { type: String, default: null },

    rating: { type: Number, default: null },
    reviewsCount: { type: Number, default: null },

    platform: { type: String, enum: ["flipkart", "mamaearth", "amazon", "ajio", "myntra","unknown"],
       required: true,
       default: "unknown",
       }
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);

import mongoose from "mongoose";
import { buildProductSearchText, normalizeText } from "../Utils/searchHelpers.js";

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    productUrl: { type: String },
    affiliateUrl: { type: String, required: true },

    affiliateType: {
      type: String,
      enum: ["earnkaro", "cuelinks"],
      default: "cuelinks",
    },
    category: {
      type: String,
      enum: [
        "tshirt",
        "shirt",
        "jeans",
        "dress",
      ],
      required: true,
    },
    brand: {
      type: String,
      default: "unknown",
      trim: true,
      lowercase: true,
      index: true,
    },
    embedding: {
      type: [Number],
      default: [],
    },
    searchableText: {
      type: String,
      default: "",
      index: true,
    },
    isSearchable: {
      type: Boolean,
      default: true,
      index: true,
    },
    currentPrice: { type: Number, default: null },
    originalPrice: { type: Number, default: null },
    discountPercent: { type: Number, default: null },
    rating: { type: Number, default: null },
    reviewsCount: { type: Number, default: null },

    platform: {
      type: String,
      enum: ["flipkart", "mamaearth", "amazon", "ajio", "myntra", "unknown"],
      required: true,
      default: "unknown",
    },

    gender: {
      type: String,
      enum: ["men", "women"],
    },
    tags: [String],

    useCase: {
      type: String,
      enum: ["casual", "formal", "gym", "party", "college"],
      default: "casual",
    },
  },
  { timestamps: true },
);

productSchema.index({
  isSearchable: 1,
  category: 1,
  brand: 1,
  gender: 1,
  useCase: 1,
  currentPrice: 1,
});

productSchema.index({
  productName: "text",
  brand: "text",
  searchableText: "text",
  tags: "text",
}, {
  weights: {
    productName: 10,
    brand: 8,
    tags: 6,
    searchableText: 4,
  },
});

productSchema.pre("save", function normalizeProductSearchData(next) {
  if (this.brand) {
    this.brand = normalizeText(this.brand);
  }

  if (Array.isArray(this.tags)) {
    this.tags = this.tags
      .map((tag) => normalizeText(tag))
      .filter(Boolean);
  }

  if (this.productUrl) {
    this.productUrl = String(this.productUrl).trim();
  }

  if (this.affiliateUrl) {
    this.affiliateUrl = String(this.affiliateUrl).trim();
  }

  this.searchableText = buildProductSearchText(this);
  next();
});

export default mongoose.model("Product", productSchema);

// models/Offer.js
import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
  productTitle: { type: String, required: true, trim: true },
  imageUrl: { type: String, required: true, trim: true },
  affiliateUrl: { type: String, required: true, trim: true }, 
  category: {
    type: String,
    enum: ["fashion", "beauty", "cosmetics", "general"],
    required: true,
    default: "general",
  },
  discount: { type: String },
  details: { type: String },      // simple description/details
  code: { type: String },         // coupon (optional)
  expiry: { type: Date },         // countdown
  featured: { type: Boolean, default: false },

  
  rating: { type: Number, default: 0 },         // average rating (e.g. 4.5)
  ratingsCount: { type: Number, default: 0 },   // how many people rated
  badges: [{ type: String }],                   // e.g. ["Best Seller", "Limited Offer"]
}, { timestamps: true });

export const Offer = mongoose.model("Offer", offerSchema);

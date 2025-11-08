import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
   
    productName: { type: String, required: true, trim: true },
    productUrl: { type: String},
    affiliateUrl: { type: String },
    imageUrl: { type: String },
    currentPrice: { type: Number },
    originalPrice: { type: Number },
     
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);

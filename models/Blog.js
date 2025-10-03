import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    affiliateUrl: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },
    productTitle: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["fashion", "beauty", "general"], 
      required: true,
      default: "general",
    },
    
    details: [
      {
        name: { type: String, required: true },
        value: { type: String },
        type: {
          type: String,
          enum: ["original", "discount", "feature"],
          default: "feature",
        }, 
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);

import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
     productTitle: { 
      type: String, 
       trim: true 
      },
      
    category: {
      type: String,
      enum: ["fashion", "beauty", "general"],
      required: true,
      default: "general",
    },
      subCategory: {
    type: String,
    required: true
  },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

  badge: { type: String, 
    enum:["Trending","Best Seller","New Arrival"],
    required:true,
    default: "Trending" },


    details: [ 
      {
        name: { type: String },
        value: { type: String },
       
      },
    ],
lastPriceUpdated: { type: Date }
    
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);

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
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    specialDay: {
    type: String,
    default: null,
  },

    details: [ 
      {
        name: { type: String },
        value: { type: String },
       
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);

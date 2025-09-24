import mongoose from "mongoose";

const FreeGuidanceSchema = new mongoose.Schema(
  {

      
        heading:{
               type: String,
            },
        description: {
           type: String,
        },
        image: {
           type: String,
        },
        productLink: {
           type: String,
        },
          buttonText: { type: String }, 

    
  },
  { timestamps: true }
);

export const FreeGuidance = mongoose.model("FreeGuidance", FreeGuidanceSchema);

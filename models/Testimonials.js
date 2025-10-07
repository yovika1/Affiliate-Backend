import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema({
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Blog",
    required: false, 
  },
  text: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    default: "Glow Reader", 
  },
  approved: {
    type: Boolean,
    default: false, 
  },
 
},{timestamps:true});

export default mongoose.model("Testimonial", testimonialSchema);

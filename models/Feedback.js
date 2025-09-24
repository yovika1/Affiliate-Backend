// models/Feedback.js
import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  blogId: { type: mongoose.Schema.Types.ObjectId, ref: "Blog" },
  feedbackType: { type: String, enum: ["yes", "no"], required: true },
  feedbackText: { type: String },
  category: { type: String },
  userEmail: { type: String },
  resolved: { type: Boolean, default: false },
adminReply: { type: String, default: "" },
} ,{timestamps:true});

export const Feedback = mongoose.model("Feedback", feedbackSchema);

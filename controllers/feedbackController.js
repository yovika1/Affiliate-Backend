import { Feedback } from "../models/Feedback.js";
import { sendFeedbackEmail, sendReplyToUser } from "../nodeMailer/feedbackService.js";

export const sendFeedback = async (req, res) => {
  try {
    const { feedbackType, feedbackText, category, blogId, userEmail } = req.body;

    if (!feedbackType) {
      return res.status(400).json({ error: "Feedback type is required" });
    }

    
    const feedback = new Feedback({
      blogId,
      feedbackType,
      feedbackText: feedbackText || "",
      category,
      userEmail: userEmail || null,
    });
    await feedback.save();

    await sendFeedbackEmail({ feedbackType, feedbackText, category, userEmail, blogId });

    // ✅ Send auto-reply to user
    // await sendAutoReply({ userEmail, category });

    res.status(200).json({ message: "Feedback stored and emails sent successfully" });
  } catch (err) {
    console.error("Error in feedbackController:", err.message);
    res.status(500).json({ error: "Failed to process feedback" });
  }
};

// Fetch all feedback (for admin panel)
export const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json(feedbacks);
  } catch (err) {
    console.error("Error fetching feedback:", err.message);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
};

export const markFeedbackResolved = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { resolved: true },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.status(200).json({ message: "Feedback marked as resolved", feedback });
  } catch (err) {
    console.error("Error marking feedback as resolved:", err.message);
    res.status(500).json({ error: "Failed to mark as resolved" });
  }
};


export const replyToFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    if (!feedback.userEmail) {
      return res.status(400).json({ error: "User email not provided" });
    }

    console.log("📨 Attempting to send email to:", feedback.userEmail);

    // Send reply email
    await sendReplyToUser(feedback.userEmail, replyMessage);

    feedback.resolved = true;
    feedback.replyMessage = replyMessage; 
    await feedback.save();

    res.status(200).json({
      message: "Reply sent and feedback marked as resolved",
      feedback,
    });
  } catch (err) {
    console.error("❌ Error replying to feedback:", err.message);
    res.status(500).json({ error: "Email not sent" });
  }
};

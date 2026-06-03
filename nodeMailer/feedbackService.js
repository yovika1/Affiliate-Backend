import nodemailer from "nodemailer";

import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user:process.env.EMAIL_ADMIN,
    pass: process.env.EMAIL_PASS,
  },
});
console.log("EMAIL_ADMIN =", process.env.EMAIL_ADMIN);
console.log("EMAIL_PASS exists?", !!process.env.EMAIL_PASS);



transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Nodemailer Transporter Error:", error.message);
  } else {
    console.log("✅ Nodemailer Transporter is ready to send emails!");
  }
});


export const sendFeedbackEmail = async (feedbackData) => {
  try {
    const { feedbackType, feedbackText, category, userEmail } = feedbackData;
    const typeNormalized = feedbackType?.toLowerCase();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>📢 New Blog Feedback Received</h2>
        <p><strong>Category:</strong> ${category || "General"}</p>
        <p><strong>Feedback Type:</strong> 
          ${typeNormalized === "yes" ? "👍 Positive" : "👎 Negative"}
        </p>
        ${typeNormalized === "no" ? `<p><strong>Reason:</strong> ${feedbackText}</p>` : ""}
        <p><strong>User Email:</strong> ${userEmail || "Not provided"}</p>
        <hr/>
        <p style="font-size: 0.9em; color: #555;">This is an automated alert from your blog feedback system.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Blog Feedback" <${process.env.EMAIL_ADMIN}>`,
      to: process.env.EMAIL_ADMIN,
      subject: `New Blog Feedback (${category || "General"})`,
      html: htmlContent,
      replyTo: userEmail || undefined, 
    });

  } catch (err) {
    console.error("❌ Error sending feedback email:", err.message);
  }
};

// ✅ Send reply email to user
export const sendReplyToUser = async (userEmail, replyMessage) => {
  try {
    if (!userEmail) {
      console.error("❌ No user email provided for reply");
      return;
    }

    await transporter.sendMail({
      from: `"Blog Support" <${process.env.EMAIL_ADMIN}>`,
      to: userEmail,
      subject: "Reply to your feedback",
        replyTo: userEmail || undefined, 

      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.5;">
          <h2>💬 Response from our team</h2>
          <p>${replyMessage}</p>
          <hr/>
          <p style="font-size:0.9em; color:#666;">Thank you for your feedback 🙏</p>
        </div>
      `,
    });

  } catch (err) {
    console.error("❌ Error sending reply to user:", err.message);
    throw new Error("Email not sent");
  }
};

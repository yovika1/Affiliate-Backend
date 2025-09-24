import nodemailer from "nodemailer";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
console.log("🔍 EMAIL_USER =", process.env.EMAIL_USER);
console.log("🔍 EMAIL_PASS length =", process.env.EMAIL_PASS?.length);


// ✅ Test transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Nodemailer Transporter Error:", error.message);
  } else {
    console.log("✅ Nodemailer Transporter is ready to send emails!");
  }
});

// ✅ Send feedback alert to admin
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
      from: `"Blog Feedback" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // ✅ Admin email
      subject: `New Blog Feedback (${category || "General"})`,
      html: htmlContent,
    });

    console.log("✅ Feedback email sent successfully to admin");
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

    console.log("📩 Attempting to send reply to:", userEmail);

    await transporter.sendMail({
      from: `"Blog Support" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Reply to your feedback",
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.5;">
          <h2>💬 Response from our team</h2>
          <p>${replyMessage}</p>
          <hr/>
          <p style="font-size:0.9em; color:#666;">Thank you for your feedback 🙏</p>
        </div>
      `,
    });

    console.log("✅ Reply email sent to user:", userEmail);
  } catch (err) {
    console.error("❌ Error sending reply to user:", err.message);
    throw new Error("Email not sent");
  }
};

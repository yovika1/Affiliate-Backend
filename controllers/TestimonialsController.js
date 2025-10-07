import Testimonials from "../models/Testimonials.js";

export const addTestimonial = async (req, res) => {
  try {
    const { blogId, text, userName } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: "Text is required" });
    }

    const newTestimonial = new Testimonials({
      blogId: blogId || null,
      text,
      userName: userName?.trim() || "Glow Reader",
    });

    await newTestimonial.save();

    res.json({
      success: true,
      message: "Thanks! Your comment is awaiting approval 🌸",
    });
  } catch (error) {
    console.error("Add Testimonial Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Get only approved 
export const getTestimonials = async (req, res) => {
  try {
    const { blogId } = req.query;
    const filter = { approved: true };
    if (blogId) filter.blogId = blogId;

    // ❌ You wrote "Testimonial" instead of "Testimonials"
    const testimonials = await Testimonials.find(filter)
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, testimonials });
  } catch (error) {
    console.error("Get Testimonials Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Get ALL testimonials (for admin panel)
export const getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonials.find()
      .sort({ createdAt: -1 });

    res.json({ success: true, testimonials });
  } catch (error) {
    console.error("Get All Testimonials Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const approveTestimonial = async (req, res) => {
  try {
    console.log("✅ Approve request received for ID:", req.params.id);
    await Testimonials.findByIdAndUpdate(req.params.id, { approved: true });
    res.json({ success: true, message: "Comment approved ✅" });
  } catch (error) {
    console.error("Approve Testimonial Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};



export const deleteTestimonial = async (req, res) => {
  try {
    await Testimonials.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Comment deleted 🗑️" });
  } catch (error) {
    console.error("Delete Testimonial Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

import Blog from "../models/Blog.js";
import Coupon from "../models/Coupen.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const totalCoupons = await Coupon.countDocuments();

    const totalClicks = 1200; // dummy value
    const totalRevenue = 8950; // dummy value

    res.json({
      totalBlogs,
      totalCoupons,
      totalClicks,
      totalRevenue,
    });
  } catch (error) {
    next(error);
  }
};
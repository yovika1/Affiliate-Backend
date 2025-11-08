import Blog from "../models/Blog.js";
import Product from "../models/Product.js";
import { fetchProductPrice } from "../Utils/fetchProductPrice.js";

export const createProduct = async (req, res) => {
  try {
    const { productUrl, affiliateUrl, category, details, productTitle, product } = req.body;

    let fetchedData = {};
    if (productUrl) {
      try {
        fetchedData = await fetchProductPrice(productUrl);
      } catch (err) {
        console.warn("⚠️ Auto-fetch failed:", err.message);
      }
    }

    const productData = {
      productName: product?.productName || fetchedData.productName || "Unknown Product",
      imageUrl: product?.imageUrl || fetchedData.imageUrl || "",
      currentPrice: product?.currentPrice || fetchedData.currentPrice || null,
      originalPrice: product?.originalPrice || fetchedData.originalPrice || null,
      productUrl: product?.productUrl || productUrl || "",
      affiliateUrl: product?.affiliateUrl || affiliateUrl || "",
    };

    const newProduct = new Product(productData);
    await newProduct.save();

    const blog = new Blog({
      productTitle,
      category,
      details,
      product: newProduct._id,
    });
    await blog.save();

    const populatedBlog = await Blog.findById(blog._id).populate("product");

    res.status(201).json({
      success: true,
      message: "Blog created successfully!",
      blog: populatedBlog,
    });
  } catch (error) {
    console.error("❌ Error creating blog:", error);
    res.status(500).json({ message: error.message });
  }
};


export const getBlogs = async (req, res) => {
  try {
const blogs = await Blog.find().populate("product");
    res.json({ blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchProduct = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: "Product URL required" });

    const fetchedData = await fetchProductPrice(url); // handles Flipkart, Meesho, Amazon
    res.json(fetchedData);
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({ message: "Failed to fetch product details" });
  }
};

// ✅ Get single blog by ID
export const getBlogById = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: "Blog ID is required" });
    }

    const blog = await Blog.findById(req.params.id).populate("product");
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.json({ blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { product, ...blogData } = req.body;

    // 1️⃣ Find the blog
    const blog = await Blog.findById(id).populate("product");
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (product && blog.product?._id) {
      await Product.findByIdAndUpdate(
        blog.product._id,
        {
          productName: product.productName,
          productUrl: product.productUrl,
          affiliateUrl: product.affiliateUrl,
          imageUrl: product.imageUrl,
          currentPrice: product.currentPrice,
          originalPrice: product.originalPrice,
          lastUpdated: new Date(),
        },
        { new: true }
      );
    }

    blog.productTitle = blogData.productTitle || blog.productTitle;
    blog.details = blogData.details || blog.details;
    blog.category = blogData.category || blog.category;
    blog.updatedAt = new Date();

    await blog.save();

    const updatedBlog = await Blog.findById(id).populate("product");

    res.status(200).json({
      message: "Blog and linked product updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    console.error("❌ Error updating blog:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ✅ DELETE blog by ID
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

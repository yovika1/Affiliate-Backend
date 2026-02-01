import Blog from "../models/Blog.js";
import Product from "../models/Product.js";
import { fetchProductPrice } from "../Utils/fetchProductPrice.js";

export const createProduct = async (req, res) => {
  try {
    const {
      productUrl,
      affiliateUrl,
      category,
      specialDay,
      details,
      productTitle,
      product,
    } = req.body;

    let fetchedData = {};
    if (productUrl) {
      fetchedData = await fetchProductPrice(productUrl);
      if (!fetchedData) {
        return res.status(400).json({
          success: false,
          message: "Unable to fetch product details.",
        });
      }
    }

    let detectedPlatform = "unknown";

    if (productUrl?.includes("flipkart.com")) detectedPlatform = "flipkart";
    else if (productUrl?.includes("amazon")) detectedPlatform = "amazon";
    // else if (productUrl?.includes("meesho")) detectedPlatform = "meesho";
    else if (productUrl?.includes("mamaearth")) detectedPlatform = "mamaearth";

    const productData = {
      productName: product?.productName || fetchedData.productName,

      imageUrl:
        product?.imageUrl ||
        (Array.isArray(fetchedData.imageUrl)
          ? fetchedData.imageUrl[0]
          : fetchedData.imageUrl),

      currentPrice: product?.currentPrice || fetchedData.currentPrice,
      originalPrice: product?.originalPrice || fetchedData.originalPrice,

      productUrl,
      affiliateUrl,

      platform: product?.platform || fetchedData.platform || detectedPlatform,
    };

    const newProduct = await Product.create(productData);

    const blog = await Blog.create({
      productTitle,
      category,
      details,
      specialDay:specialDay|| null,
      product: newProduct._id,
    });

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


// FETCH PRODUCT (auto scrape)

export const fetchProduct = async (req, res) => {
  try {
    const { url } = req.body;

    const product = await fetchProductPrice(url);

    if (!product || !product.productName) {
      return res.status(400).json({ error: "Failed to fetch product details" });
    }

    return res.json(product);
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


// GET ALL BLOGS
export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().populate("product");
    res.json({ blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE BLOG
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("product");
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json({ blog });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE BLOG + PRODUCT
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { product, ...blogData } = req.body;

    const blog = await Blog.findById(id).populate("product");
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    if (product && blog.product?._id) {
      await Product.findByIdAndUpdate(
        blog.product._id,
        { ...product, lastUpdated: new Date() },
        { new: true }
      );
    }

    blog.productTitle = blogData.productTitle || blog.productTitle;
    blog.details = blogData.details || blog.details;
    blog.category = blogData.category || blog.category;
    blog.updatedAt = new Date();

    await blog.save();

    const updatedBlog = await Blog.findById(id).populate("product");

    res.json({
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// DELETE BLOG
export const deleteBlog = async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

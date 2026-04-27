import Blog from "../models/Blog.js";
import Product from "../models/Product.js";
import { fetchProductPrice } from "../utils/fetchProductPrice.js";
import { generateEmbedding } from "../services/intentService.js";
import { buildProductSearchText, normalizeText } from "../utils/searchHelpers.js";

export const createProduct = async (req, res) => {
  try {
    const {
      productUrl,
      affiliateUrl,
      category,
      subCategory,
      details,
      productTitle,
      product,
      badge
    } = req.body;

  
    if (!affiliateUrl || !category) {
      return res.status(400).json({
        success: false,
        message: "productUrl, affiliateUrl and category are required",
      });
    }

   
    const existingProduct = await Product.findOne({ productUrl });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product already exists",
      });
    }

    let fetchedData = {};

    try {
      if (productUrl) {
        fetchedData = await fetchProductPrice(productUrl);
      }
    } catch (err) {
      console.log("Scraping failed, using manual data if provided");
    }

    let detectedPlatform = "unknown";

    if (productUrl?.includes("flipkart.com")) detectedPlatform = "flipkart";
    else if (productUrl?.includes("amazon")) detectedPlatform = "amazon";
    else if (productUrl?.includes("mamaearth")) detectedPlatform = "mamaearth";
    else if (productUrl?.includes("ajio")) detectedPlatform = "ajio";
    else if (productUrl?.includes("myntra")) detectedPlatform = "myntra";

 
    const currentPrice =
      product?.currentPrice ?? fetchedData?.currentPrice ?? null;

    const originalPrice =
      product?.originalPrice ?? fetchedData?.originalPrice ?? null;

    /* Auto Discount Calculate */
    let discountPercent =
      product?.discountPercent ?? fetchedData?.discountPercent ?? null;

    if (  
      !discountPercent &&
      originalPrice &&
      currentPrice &&
      originalPrice > currentPrice
    ) {
      discountPercent = Math.round(
        ((originalPrice - currentPrice) / originalPrice) * 100
      );
    }

    const productData = {
      productName:
        product?.productName || fetchedData?.productName || "Untitled Product",

      imageUrl:
        product?.imageUrl ||
        (Array.isArray(fetchedData?.imageUrl)
          ? fetchedData.imageUrl[0]
          : fetchedData?.imageUrl) ||
        "",

      productUrl,
      affiliateUrl,

      currentPrice,
      originalPrice,
      discountPercent,

      rating: product?.rating ?? fetchedData?.rating ?? null,
      reviewsCount:
        product?.reviewsCount ?? fetchedData?.reviewsCount ?? null,

      category,
      brand: normalizeText(product?.brand || fetchedData?.brand || "unknown"),
      gender: product?.gender ?? fetchedData?.gender ?? undefined,
      useCase: product?.useCase ?? "casual",
      tags: Array.isArray(product?.tags) ? product.tags.map(normalizeText) : [],
      platform:
        product?.platform || fetchedData?.platform || detectedPlatform,
    };

    productData.searchableText = buildProductSearchText(productData);
    productData.embedding = await generateEmbedding(productData.searchableText);

   
    const newProduct = await Product.create(productData);

 
    const blog = await Blog.create({
      productTitle: productTitle || productData.productName,
      category,
      subCategory, 
      badge,
      details: details || [],
      product: newProduct._id,
    });

    const populatedBlog = await Blog.findById(blog._id).populate("product");

  
    return res.status(201).json({
      success: true,
      message: "Blog created successfully!",
      blog: populatedBlog,
    });
  } catch (error) {
    console.error("❌ Error creating blog:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// FETCH PRODUCT (auto scrape)

export const fetchProduct = async (req, res) => {
   console.log("🔥 SCRAPER STARTED");

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
    const blogs = await Blog.find().sort({ createdAt: -1 }).populate("product");
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
      const nextProduct = {
        ...product,
        brand: product.brand ? normalizeText(product.brand) : blog.product.brand,
        searchableText: buildProductSearchText({
          ...blog.product.toObject(),
          ...product,
          brand: product.brand ? normalizeText(product.brand) : blog.product.brand,
        }),
      };

      nextProduct.embedding = await generateEmbedding(nextProduct.searchableText);
      await Product.findByIdAndUpdate(
        blog.product._id,
        { ...nextProduct, lastUpdated: new Date() },
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

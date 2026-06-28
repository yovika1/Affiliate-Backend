import Blog from "../models/Blog.js";
import Product from "../models/Product.js";
import { fetchProductPrice } from "../Utils/fetchProductPrice.js";
import { generateEmbedding } from "../services/intentService.js";
import {
  buildProductSearchText,
  normalizeText,
} from "../Utils/searchHelpers.js";
import {
  detectCategory,
  detectBeautyCategory,
} from "../Utils/productHelpers.js";

export const createProduct = async (req, res) => {
  try {
    const {
      productUrl,
      affiliateUrl,
      category,
      subCategory,
      productTitle,
      badge,
      productName,
      currentPrice,
      originalPrice,
      rating,
      reviewsCount,
      discountPercent,
    } = req.body;

    const details = req.body.details
      ? JSON.parse(req.body.details)
      : [];

    if (!affiliateUrl || !category) {
      return res.status(400).json({
        success: false,
        message: "affiliateUrl and category are required",
      });
    }

    const existingProduct = await Product.findOne({
      productUrl,
    });

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
      console.log(
        "Scraping failed, using manual data"
      );
    }

    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.imageUrl ||
      (
          Array.isArray(fetchedData?.imageUrl)
            ? fetchedData.imageUrl[0]
            : fetchedData?.imageUrl
        ) || "";

    let detectedPlatform = "unknown";

    if (productUrl?.includes("flipkart"))
      detectedPlatform = "flipkart";
    else if (productUrl?.includes("amazon"))
      detectedPlatform = "amazon";
    else if (productUrl?.includes("myntra"))
      detectedPlatform = "myntra";
    else if (productUrl?.includes("ajio"))
      detectedPlatform = "ajio";


    let productCategory = category;
    let finalSubCategory = subCategory;

const finalName =
  productName ||
  fetchedData?.productName ||
  "";
  
if (category === "fashion") {
  const detected = detectCategory(finalName);

  if (detected) {
    finalSubCategory = detected;
  }
}
if (category === "beauty") {
  productCategory = "beauty";

  finalSubCategory =
    detectBeautyCategory(finalName) ||
    subCategory;
}
      
const productData = {
  productName:
    productName ||
    fetchedData?.productName ||
    "Untitled Product",

  imageUrl,

  productUrl,
  affiliateUrl,

  currentPrice:
    Number(currentPrice) ||
    fetchedData?.currentPrice,

  originalPrice:
    Number(originalPrice) ||
    fetchedData?.originalPrice,

  discountPercent:
    Number(discountPercent) ||
    fetchedData?.discountPercent,

  rating:
    Number(rating) ||
    fetchedData?.rating,

  reviewsCount:
    Number(reviewsCount) ||
    fetchedData?.reviewsCount,

  category: productCategory,
  subCategory: finalSubCategory,

  brand: normalizeText(
    fetchedData?.brand || "unknown"
  ),

  platform: detectedPlatform,
};

productData.searchableText =
  buildProductSearchText(productData);

productData.embedding =
  await generateEmbedding(
    productData.searchableText
  );


    const newProduct =
      await Product.create(productData);

    const blog = await Blog.create({
      productTitle:
        productTitle ||
        productData.productName,

    
  category: productCategory,
  subCategory: finalSubCategory,
      badge,
      details,

      product: newProduct._id,
    });

    const populatedBlog =
      await Blog.findById(blog._id)
        .populate("product");

    res.status(201).json({
      success: true,
      message:
        "Blog created successfully",
      blog: populatedBlog,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
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

    const blog = await Blog.findById(id).populate("product");
    if (!blog) return res.status(404).json({ message: "Blog not found" });

     const product = req.body.product
      ? JSON.parse(req.body.product)
      : null;

    const blogData = req.body;

    if (product && blog.product?._id) {
      const nextProduct = {
        ...product,

         imageUrl: req.file
          ? `/uploads/${req.file.filename}`
          :  product.imageUrl ||
          blog.product.imageUrl,

        brand: product.brand
          ? normalizeText(product.brand)
          : blog.product.brand,
      }

      nextProduct.searchableText = buildProductSearchText({
        ...blog.product.toObject(),
        ...product,
        brand: product.brand
          ? normalizeText(product.brand)
          : blog.product.brand,
      });

      nextProduct.embedding = await generateEmbedding(
        nextProduct.searchableText,
      );
      await Product.findByIdAndUpdate(
        blog.product._id,
        { ...nextProduct, lastUpdated: new Date() },
        { new: true },
      );
    }

    blog.productTitle = blogData.productTitle || blog.productTitle;
    blog.category = blogData.category || blog.category;
    blog.details = blogData.details 
      ? JSON.parse(blogData.details)
      : blog.details;
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

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config();

const detectGender = (text = "") => {
  const value = text.toLowerCase();

  if (
    value.includes("women") ||
    value.includes("woman") ||
    value.includes("girls") ||
    value.includes("ladies")
  ) {
    return "women";
  }

  if (
    value.includes("men") ||
    value.includes("man's") ||
    value.includes("mens") ||
    value.includes("boys")
  ) {
    return "men";
  }

  return null;
};

const detectColor = (text = "") => {
  const colors = [
    "black",
    "white",
    "blue",
    "navy",
    "grey",
    "gray",
    "yellow",
    "green",
    "olive",
    "red",
    "maroon",
    "pink",
    "purple",
    "beige",
    "brown",
    "orange",
  ];

  const value = text.toLowerCase();

  return colors.find((c) => value.includes(c)) || null;
};

const detectStyle = (text = "") => {
  const value = text.toLowerCase();

  if (value.includes("oversized")) return "oversized";
  if (value.includes("wide leg")) return "wide-leg";
  if (value.includes("regular fit")) return "regular-fit";
  if (value.includes("slim fit")) return "slim-fit";
  if (value.includes("loose fit")) return "loose-fit";
  if (value.includes("cargo")) return "cargo";
  if (value.includes("baggy")) return "baggy";
  if (value.includes("straight fit")) return "straight-fit";
  if (value.includes("bootcut")) return "bootcut";

  return null;
};

const detectPattern = (text = "") => {
  const value = text.toLowerCase();

  if (value.includes("graphic")) return "graphic";
  if (value.includes("printed")) return "printed";
  if (value.includes("floral")) return "floral";
  if (value.includes("checked")) return "checked";
  if (value.includes("check")) return "checked";
  if (value.includes("striped")) return "striped";
  if (value.includes("stripe")) return "striped";
  if (value.includes("solid")) return "solid";

  return null;
};

const detectBeautySubCategory = (text = "") => {
  const value = text.toLowerCase();

  if (value.includes("lipstick")) return "lipstick";
  if (value.includes("foundation")) return "foundation";
  if (value.includes("concealer")) return "concealer";
  if (value.includes("blush")) return "blush";
  if (value.includes("mascara")) return "mascara";
  if (value.includes("eyeliner")) return "eyeliner";

  return "skincare";
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);

    console.log("✅ MongoDB Connected");

    const products = await Product.find();

    let updated = 0;

    for (const product of products) {
      const text = `
        ${product.productName || ""}
        ${product.productUrl || ""}
      `;

      let category = product.category;
      let subCategory = product.subCategory;

      // Fashion migration
      if (
        ["tshirt", "shirt", "jeans", "dresses"].includes(
          product.category
        )
      ) {
        category = "fashion";
        subCategory = product.category;
      }

      // Beauty migration
      if (product.category === "beauty") {
        category = "beauty";

        subCategory =
          product.subCategory ||
          detectBeautySubCategory(text);
      }

      const updates = {
        category,
        subCategory,

        gender: detectGender(text),
        color: detectColor(text),
        style: detectStyle(text),
        pattern: detectPattern(text),
      };

      await Product.updateOne(
        { _id: product._id },
        {
          $set: updates,
        }
      );

      updated++;

      console.log(
        `Updated ${updated}/${products.length}`
      );
    }

    console.log(
      `✅ Migration completed. Updated ${updated} products`
    );

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Error:", err);
    process.exit(1);
  }
};

migrate();
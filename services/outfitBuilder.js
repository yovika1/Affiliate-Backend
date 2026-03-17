import Product from "../models/Product.js";

export const buildOutfit = async () => {

  const dress = await Product.findOne({
    category: "fashion",
    subCategory: "dresses"
  }).sort({ rating: -1 });

  const jeans = await Product.findOne({
    category: "fashion",
    subCategory: "jeans"
  }).sort({ rating: -1 });

  const men = await Product.findOne({
    category: "fashion",
    subCategory: "mens-collection"
  }).sort({ rating: -1 });

  const makeup = await Product.findOne({
    category: "beauty",
    subCategory: "makeup"
  }).sort({ rating: -1 });

  const skincare = await Product.findOne({
    category: "beauty",
    subCategory: "skincare"
  }).sort({ rating: -1 });

  const outfitProducts = [];

  if (dress) outfitProducts.push(dress);
  if (jeans) outfitProducts.push(jeans);
    if (men) outfitProducts.push(men);
  if (makeup) outfitProducts.push(makeup);
  if (skincare) outfitProducts.push(skincare);

  return {
    reply: "Here’s a stylish combo you can try 👇",
    products: outfitProducts
  };

};
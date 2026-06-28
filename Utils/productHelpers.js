import { normalizeText } from "./searchHelpers.js";

export const detectCategory = (name = "") => {
  const n = normalizeText(name);

  if (n.includes("tshirt") || n.includes("tee"))
    return "tshirt";

  if (n.includes("shirt") || n.includes("polo"))
    return "shirt";

  if (n.includes("jeans") || n.includes("denim"))
    return "jeans";

  if (n.includes("dresses") || n.includes("gown"))
    return "dresses";

  return null;
};

export const detectBeautyCategory = (
  name = ""
) => {
  const n = normalizeText(name);

  if (n.includes("lipstick"))
    return "lipstick";

  if (n.includes("foundation"))
    return "foundation";

  if (n.includes("concealer"))
    return "concealer";

  if (n.includes("blush"))
    return "blush";

  if (n.includes("mascara"))
    return "mascara";

  if (n.includes("eyeliner"))
    return "eyeliner";

  if (
    n.includes("face wash") ||
    n.includes("cleanser") ||
    n.includes("serum") ||
    n.includes("moisturizer") ||
    n.includes("sunscreen")
  ) {
    return "skincare";
  }

  return "skincare";
};
export const detectIntent = (message) => {

  const text = message.toLowerCase();

  const makeupKeywords = [
    "makeup","lipstick","foundation","skincare","concealer","mascara"
  ];

  const outfitKeywords = [
    "outfit","look","wear with","combination","style","pair with"
  ];

  if (makeupKeywords.some(word => text.includes(word))) {
    return "makeup_recommendation";
  }

  if (outfitKeywords.some(word => text.includes(word))) {
    return "outfit_builder";
  }

  return "product_search";
};
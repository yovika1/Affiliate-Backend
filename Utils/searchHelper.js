export const synonymMap = {

  boys: "men",
  boy: "men",
  mens: "men",
  gents: "men",

  girls: "women",
  ladies: "women",
  womens: "women",

  tshirt: "t-shirt",
  tee: "t-shirt",
  tshirts: "t-shirt",

  shirt: "shirt",
  shirts: "shirt",

  top: "top",
  tops: "top",

  hoodie: "hoodie",
  sweatshirt: "hoodie",

  pant: "pants",
  trousers: "pants",
  pyjama: "lower",
  pajamas: "lower",
  joggers: "lower",

  jeanss: "jeans",

  kurta: "kurti",
  ethnic: "kurti",

  gown: "dress",
  frock: "dress",

  
  makeup: "skin care",
  cosmetics: "skin care",
  skincare: "skin care",

  lipbalm: "lipstick",
cream: "moisturizer",
facewash: "cleanser",
cleanser: "facewash",
serum: "serum",
spf: "sunscreen"

};

export const typoMap = {

  shrit: "shirt",
  shrt: "shirt",
  tshrt: "t-shirt",

  jeens: "jeans",
  jens: "jeans",

  kurta: "kurti",

  makup: "makeup",
  makep: "makeup",

  lipstik: "lipstick",

};

export const recommendationMap = {

  
  shirt: "jeans",
  "t-shirt": "jeans",
  tshirt: "jeans",
  hoodie: "jeans",
  top: "jeans",

  jeans: "t-shirt",
  pants: "shirt",
  lower: "t-shirt",

  kurti: "leggings",
  kurta: "pyjama",

  dress: "top",

  "skin care": "makeup"

};
export const colorWords = [
  "black",
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "pink",
  "orange",
  "purple",
  "brown",
  "grey",
  "gray"
];

export const productTypes  = [
  "shirt",
  "t-shirt",
  "jeans",
  "pants",
  "lower",
  "dress",
  "top",
  "hoodie",
  "kurti",
  "leggings",
  "sunscreen",
  "lipstick",
  "moisturizer",
  "serum",
  "cleanser"
];

export const similarCategoryMap = {

  shirt: ["t-shirt", "hoodie", "top"],
  "t-shirt": ["shirt", "hoodie"],
  jeans: ["pants", "lower"],
  pants: ["jeans", "lower"],
  kurti: ["dress", "top"],
  dress: ["top"],
  hoodie: ["t-shirt", "shirt"]

};

export const detectProductType = (words) => {

  for (const word of words) {
    if (productTypes.includes(word)) {
      return word;
    }
  }

  return null;

};

export const removeColors = (words) => {

  return words.filter(word => !colorWords.includes(word));

};

export const correctTypos = (words) => {

  return words.map(word => typoMap[word] || word);

};

export const normalizeMessage = (words) => {

  return words.map(word => synonymMap[word] || word);

};

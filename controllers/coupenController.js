import { Offer } from "../models/Coupen.js";

const fetchAmazonOffers = async () => {
  return []; 
};

export const getOffers = async (req, res) => {
  try {
    const now = new Date();

    const dbOffers = await Offer.find({
      $or: [{ expiry: null }, { expiry: { $gte: now } }]
    }).lean();

    const amazonOffers = await fetchAmazonOffers();

    const mergedOffers = [...dbOffers, ...amazonOffers];

    res.json(mergedOffers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Add new offer
export const addOffer = async (req, res) => {
  try {
    const newOffer = new Offer(req.body);
    await newOffer.save();
    res.json(newOffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Featured offers (from DB only)
export const getFeaturedOffers = async (req, res) => {
  try {
    const now = new Date();

    const featured = await Offer.find({
      featured: true,
      $or: [{ expiry: null }, { expiry: { $gte: now } }]
    });

    res.json(featured);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update offer
export const updateOffer = async (req, res) => {
  try {
    const updated = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete offer
export const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: "Offer deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

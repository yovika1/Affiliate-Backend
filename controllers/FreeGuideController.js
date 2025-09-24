import { FreeGuidance } from "../models/FreeGuide.js";

// Create new guidance
export const createGuide = async (req, res) => {
  try {
    const newGuidance = new FreeGuidance(req.body);
    await newGuidance.save();
    res.status(201).json(newGuidance);
  } catch (error) {
    res.status(500).json({ message: "Error creating guidance", error: error.message });
  }
};

// Get all guidances
export const getGuide = async (req, res) => {
  try {
    const guidances = await FreeGuidance.find().sort({ createdAt: -1 });
    res.status(200).json(guidances);
  } catch (error) {
    res.status(500).json({ message: "Error fetching guidances", error: error.message });
  }
};

// Get single guidance by ID
export const getFreeGuidanceById = async (req, res) => {
  try {
    const guidance = await FreeGuidance.findById(req.params.id);
    if (!guidance) return res.status(404).json({ message: "Guidance not found" });
    res.status(200).json(guidance);
  } catch (error) {
    res.status(500).json({ message: "Error fetching guidance", error: error.message });
  }
};

// Update guidance
export const updateGuide = async (req, res) => {
  try {
    const updated = await FreeGuidance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Guidance not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating guidance", error: error.message });
  }
};

// Delete guidance
export const deleteguidance = async (req, res) => {
  try {
    const deleted = await FreeGuidance.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Guidance not found" });
    res.status(200).json({ message: "Guidance deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting guidance", error: error.message });
  }
};

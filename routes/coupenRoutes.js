import express from "express";
import { addOffer, deleteOffer, getFeaturedOffers, getOffers, updateOffer } from "../controllers/coupenController.js";

const coupenRoutes = express.Router();

coupenRoutes.get("/getoffers", getOffers);
coupenRoutes.get("/getoffers/featured", getFeaturedOffers);

coupenRoutes.post("/createoffer", addOffer);
coupenRoutes.put("/updateoffer/:id", updateOffer);
coupenRoutes.delete("/deleteoffer/:id", deleteOffer);

export default coupenRoutes;

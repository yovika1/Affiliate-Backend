import express from "express";
import { createGuide, deleteguidance, getGuide, updateGuide } from "../controllers/FreeGuideController.js";

const GuidanceRouter = express.Router();

GuidanceRouter.get("/getGuide", getGuide);
GuidanceRouter.post("/createGuide", createGuide);
GuidanceRouter.put("/updateGuide/:id", updateGuide);
GuidanceRouter.delete("/deleteguidance/:id", deleteguidance);

export default GuidanceRouter;

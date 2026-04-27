import express from "express";
import { chatHandler } from "../controllers/chatController.js";
import { aiRateLimit } from "../middleware/aiRateLimit.js";
import { aiInputGuard } from "../middleware/aiInputGuard.js";

const aiRouter = express.Router();

aiRouter.post("/chat", aiRateLimit, aiInputGuard, chatHandler);

export default aiRouter;

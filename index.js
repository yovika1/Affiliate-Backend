import express from "express";
import dotenv from "dotenv"
dotenv.config();
import path from "path";
import cors from "cors";
import connectDB from "./dbConnection/Connection.js";
import blogRoutes from "./routes/blogRoutes.js";
import coupenRoutes from "./routes/coupenRoutes.js";
import FeedbackRouter from "./routes/FeedbackRoutes.js";
import GuidanceRouter from "./routes/GuideRoutes.js";
import testimonialRouter from "./routes/TestimonialsRoutes.js";
import "./Utils/PriceUpdater.js";
import aiRouter from "./routes/aiChat.js";
import { initRedis } from "./Utils/redisClient.js";

const app = express()
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);
app.use(express.json({ limit: "32kb" }));
app.use(cors({origin: "*",
   methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(blogRoutes)
app.use(coupenRoutes)
app.use(FeedbackRouter)
app.use(GuidanceRouter)
app.use(testimonialRouter)
app.use("/ai",aiRouter)

connectDB()
.then(async () => {
  await initRedis();
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server running at::${process.env.PORT}`);
  });
})
.catch((err) => {
  console.log("MONGO db connection failed !!", err);
});

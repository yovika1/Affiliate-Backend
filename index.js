import express from "express";
import dotenv from "dotenv"
import cors from "cors";
import connectDB from "./dbConnection/Connection.js";
import blogRoutes from "./routes/blogRoutes.js";
// import router from "./routes/dashboardRoutes.js";
import coupenRoutes from "./routes/coupenRoutes.js";
import FeedbackRouter from "./routes/FeedbackRoutes.js";
import GuidanceRouter from "./routes/GuideRoutes.js";

const app = express()
dotenv.config();

app.use(express.json());
app.use(cors({origin: "*",
   methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(blogRoutes)
app.use(coupenRoutes)
app.use(FeedbackRouter)
app.use(GuidanceRouter)

// app.use(router)

connectDB()
.then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server running at::${process.env.PORT}`);
  });
})
.catch((err) => {
  console.log("MONGO db connection failed !!", err);
});
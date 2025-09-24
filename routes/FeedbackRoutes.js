import express from "express";
import { getAllFeedback, markFeedbackResolved, replyToFeedback, sendFeedback } from "../controllers/feedbackController.js";

const FeedbackRouter = express.Router()
FeedbackRouter.post('/send-feedback',sendFeedback);
FeedbackRouter.get('/getfeedback',getAllFeedback);
FeedbackRouter.put('/resolve/:id',markFeedbackResolved);
FeedbackRouter.post('/reply/:id',replyToFeedback);



export default FeedbackRouter;

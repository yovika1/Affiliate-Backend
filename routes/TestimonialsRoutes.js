 import express from 'express'
import { addTestimonial, getTestimonials, deleteTestimonial, getAllTestimonials, approveTestimonial } from '../controllers/TestimonialsController.js';

 const testimonialRouter = express.Router();


testimonialRouter.get('/getcomments', getTestimonials)
testimonialRouter.post('/addComment',addTestimonial)

testimonialRouter.get("/admin/all", getAllTestimonials);
testimonialRouter.put("/approve/:id", approveTestimonial);
testimonialRouter.delete('/deleteComment/:id',deleteTestimonial)


export default testimonialRouter;

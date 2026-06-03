import express from "express";
import { createProduct, deleteBlog, fetchProduct, getBlogById, getBlogs, updateBlog } from "../controllers/blogController.js";
import upload from "../middleware/upload.js";

const blogRoutes = express.Router()

blogRoutes.post('/fetch-product', fetchProduct);
  // for auto-fetch
blogRoutes.get('/getBlogs',getBlogs)
// Single blog by ID
blogRoutes.get('/getBlogs/:id',getBlogById)
blogRoutes.post('/create', upload.single("image"),createProduct)
blogRoutes.put('/update/:id', upload.single("image"),updateBlog)
blogRoutes.delete('/delete/:id', deleteBlog)

export default blogRoutes;
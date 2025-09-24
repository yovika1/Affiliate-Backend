import express from "express";
import { createBlog, deleteBlog, getBlogById, getBlogs, updateBlog } from "../controllers/blogController.js";

const blogRoutes = express.Router()

blogRoutes.get('/getBlogs',getBlogs)
// Single blog by ID
blogRoutes.get('/getBlogs/:id',getBlogById)
blogRoutes.post('/create',createBlog)
blogRoutes.put('/update/:id',updateBlog)
blogRoutes.delete('/delete/:id', deleteBlog)

export default blogRoutes;
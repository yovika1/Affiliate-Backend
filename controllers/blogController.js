
import Blog from '../models/Blog.js'

  export const getBlogs = async (req, res) => {
    try {
      const blogs = await Blog.find();
res.json({  blogs });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// ✅ CREATE new blog
export const createBlog = async (req, res) => {
  try {
    const blog = new Blog(req.body)
    
    await blog.save();
    res.status(201).json({ blog });
;
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get single blog by ID
export const getBlogById = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: "Blog ID is required" });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
res.json({ blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!blog) return res.status(404).json({ message: "Blog not found" });
res.json({ blog });
;
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// ✅ DELETE blog by ID
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
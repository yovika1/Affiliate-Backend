import mongoose from "mongoose";
const connectDB = async () =>{
    try {
         await mongoose.connect (`${process.env.MONGODB_URL}`)
        console.log("\n MongoDB Connected");
    } catch (error) {
         console.log("MongoDB Connection FAILED",error);
       process.exit()
        
    }
}

export default connectDB;

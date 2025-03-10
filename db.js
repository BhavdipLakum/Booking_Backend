const mongoose = require("mongoose");
require("dotenv").config();

// Add this line to address the deprecation warning
mongoose.set("strictQuery", false);

const dbUrl = process.env.MONGO_URI;
console.log("Connecting to MongoDB:", dbUrl);

const connectToMongo = async () => {
  try {
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("DATABASE CONNECTED");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
};

module.exports = connectToMongo;

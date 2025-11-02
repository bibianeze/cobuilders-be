// config/db.js
const mongoose = require('mongoose');

const connectDB = async (mongoUri) => {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1); // stop the process if DB connection fails
  }
};

module.exports = connectDB;

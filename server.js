// server.js - main server file
// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const bookingsRoutes = require('./routes/bookings');

// Create Express app
const app = express();

// Port from env or fallback
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas using MONGO_URI from .env
connectDB(process.env.MONGO_URI);

// Middleware
// Allow requests from the frontend (CLIENT_URL), and allow credentials
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());
app.use('/api/bookings', bookingsRoutes);


// below your other app.use and before app.listen
// *****
const { protect } = require('./middleware/authMiddleware');
app.get('/api/auth/me', protect, (req, res) => {
  // req.user is attached by the middleware
  res.json({ user: req.user });
});

// Mount authentication routes under /api/auth
app.use('/api/auth', authRoutes);

// A simple root route to verify server is running
app.get('/', (req, res) => {
  res.send('Auth API running');
});
// FINALLY: YOU WANT TO SET A HOME ROUTE FOR WHEN WE HOST: SO MAKE SUREE YOU DO THIS BEFORE POST
app.get("/",(req,res)=>{
    res.status(200).json({success:true,message:"server is live"});
})



// Start listening
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

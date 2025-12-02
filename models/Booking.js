// backend/models/Booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // user details (stored again for quick access / history)
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },

  // space selection
  bedrooms: { type: Number, required: true, min: 1, max: 4 },
  bathrooms: { type: Number, required: true, min: 1, max: 4 },

  // service selection
  serviceType: {
    type: String,
    enum: ["standard", "deep", "post_construction"],
    required: true,
  },

  // frequency
  frequency: {
    type: String,
    enum: ["one_time", "weekly", "two_weeks", "four_weeks"],
    required: true,
  },

  // price computed by server
  price: { type: Number, required: true },

  status: {
    type: String,
    enum: ["pending", "done", "cancelled"],
    default: "pending",
  },

  // optional scheduled date (if you collect)
  scheduledDate: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

// Index to fetch user bookings faster
bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);

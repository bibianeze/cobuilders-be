// backend/routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

/**
 * POST /api/bookings
 * Create a booking for the logged-in user
 * Body: {
 *  firstName, lastName, email, phone, bedrooms, bathrooms,
 *  serviceType, frequency, totalAmount, scheduledDate
 * }
 */
router.post('/', protect, async (req, res) => {
  try {
    const user = req.user;

    const {
      firstName,
      lastName,
      email,
      phone,
      bedrooms,
      bathrooms,
      serviceType,
      frequency,
      price,
      scheduledDate
    } = req.body;
    console.log(req.body);
    
    

    // Basic validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    if (!serviceType || !frequency) {
      return res.status(400).json({ message: 'Service type and frequency are required.' });
    }

    // Match logged-in user's email for security
    if (user.email !== String(email).toLowerCase()) {
      return res.status(403).json({ message: 'Email does not match logged-in user.' });
    }

    // Save booking to database
    const booking = new Booking({
      user: user._id,
      firstName,
      lastName,
      email,
      phone,
      bedrooms,
      bathrooms,
      serviceType,
      frequency,
      price, // frontend calculation
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined
    });

    

    await booking.save();
    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (err) {
    console.error('Booking error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/bookings
 * Get all bookings for logged-in user
 */
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    // console.log(req.user);
    
    const bookings = await Booking.find({ user: user.id }).sort({ createdAt: -1 });
    res.json({ bookings });
    
  } catch (err) {
    // console.error('List bookings error:', err.message);
    console.log(err);
    
    res.status(500).json({ message: err.message });
    
  }

});

/**
 * GET /api/bookings/:id
 * Get single booking (only if owned by user)
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.user) !== String(user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json({ booking });
  } catch (err) {
    console.error('Get booking error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


/**
 * PUT /api/bookings/:id/status
 * Update status (owner or admin). Body: { status: 'done'|'pending'|'cancelled' }
 */
router.put('/:id/status', protect, async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Only owner can change status for now (you can add isAdmin check later)
    if (String(booking.user) !== String(user._id)) {
      return res.status(403).json({ message: 'Not allowed to update this booking' });
    }

    if (!['pending', 'done', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    booking.status = status;
    await booking.save();

    res.json({ message: 'Status updated', booking });
  } catch (err) {
    console.error('Update status error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update booking status by ID
router.put('/:id', protect, async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(booking);
  } catch (err) {
    console.error('Update booking error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/**
 * DELETE /api/bookings/:id
 * Cancel booking (owner). This will mark as 'cancelled'
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (String(booking.user) !== String(user._id)) {
      return res.status(403).json({ message: 'Not allowed to cancel this booking' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    console.error('Cancel booking error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

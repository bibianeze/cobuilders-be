// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Helper to create JWT token
const signToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * POST /api/auth/signup
 * Body: { email, password }
 * Creates user, returns token and user info
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    // basic validation
    if (!email || !password) return res.status(400).json({ message: 'Please provide email and password' });

    // check for existing user
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // create user
    const user = new User({ email, password: hashed });
    await user.save();

    const token = signToken(user);

    res.status(201).json({
      message: 'User created',
      user: { id: user._id, email: user.email },
      token
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns token and user info
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Please provide email and password' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(user);

    res.json({ message: 'Logged in', user: { id: user._id, email: user.email }, token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Sends a reset link to the email (if exists)
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Please provide an email' });

    const user = await User.findOne({ email });

    // Always return same message to avoid revealing whether email exists
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' });

    // Create reset token (raw) and save hashed version in DB
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

   const html = `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
    <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
      <p style="font-size: 15px; color: #555;">
        Hello, <br/><br/>
        You recently requested to reset your password. Click the button below to choose a new password.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
          Reset My Password
        </a>
      </div>
      <p style="font-size: 13px; color: #888;">
        If you didn’t request a password reset, you can safely ignore this email. <br/>
        This link will expire in 1 hour.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        &copy; ${new Date().getFullYear()} Baybe — All rights reserved.
      </p>
    </div>
  </div>
`;

await sendEmail({
  to: user.email,
  subject: 'Password Reset Instructions',
  html,
});


    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/auth/reset-password/:token
 * Body: { password }
 * Uses token (raw) to find user, then updates password.
 */
router.post('/reset-password/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Please provide a new password' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    // hash and save new password, clear reset fields
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

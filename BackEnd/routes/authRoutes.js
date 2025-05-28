const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
require("dotenv").config();

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register User
router.post("/register", async (req, res) => {
  let { name, email, password } = req.body;
  email = email.toLowerCase().trim();

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, userId: user._id, name: user.name });
    console.log(res);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Login User
router.post("/login", async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "No user found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid Credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, userId: user._id, name: user.name });
    console.log(res);
  } catch (err) {
    res.status(500).send("Server Error",err);
  }
});

// Google OAuth login
router.post("/google", async (req, res) => {
  const { idToken } = req.body;
  try {
    // Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email_verified, email, name, picture } = payload;

    if (!email_verified) {
      return res.status(400).json({ msg: "Google email not verified" });
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      user = new User({
        name,
        email: email.toLowerCase().trim(),
        password: "",        // no local password
        google: true,
        avatar: picture,
      });
      await user.save();
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, userId: user._id, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: "Google authentication failed" });
  }
});

module.exports = router;

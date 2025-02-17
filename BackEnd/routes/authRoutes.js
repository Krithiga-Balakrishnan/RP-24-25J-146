const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

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
  const { email, password } = req.body;
  console.log(email);

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

module.exports = router;

const express = require("express");
const router = express.Router();
const User = require("../models/User");

// GET /api/users - retrieve all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;

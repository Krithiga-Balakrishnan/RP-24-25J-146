const express = require("express");
const multer = require("multer");
const Author = require("../models/Pad"); // Use Author model
const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new author profile
router.post("/contributors", upload.single("profilePicture"), async (req, res) => {
  try {
    const { name, email, position, about, bio } = req.body;
    const profilePicture = req.file ? req.file.buffer.toString("base64") : null;

    const newAuthor = new Author({
      name,
      email,
      position,
      about,
      bio,
      profilePicture,
    });

    await newAuthor.save();
    res.status(201).json({ message: "Profile saved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

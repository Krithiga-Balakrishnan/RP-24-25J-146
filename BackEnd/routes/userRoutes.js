const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// ————— Configure multer to store avatars in /uploads/avatars —————
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads", "avatars");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // e.g. user-605c5a2f1e4e2-avatar.jpg
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.userId}-avatar${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB limit

// ————— GET /api/users — retrieve all users (no password) —————
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ————— GET /api/users/user — return current user (no password) —————
router.get("/user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ————— GET /api/users/:id — return any user by id (no password) —————
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ————— PATCH /api/users/user — update name / linkedin / github —————
router.patch("/user", auth, async (req, res) => {
  const { name, linkedin, github } = req.body;
  if (name === undefined && linkedin === undefined && github === undefined) {
    return res.status(400).json({ msg: "Nothing to update" });
  }

  try {
    // 1) Load, update, and save
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (name     !== undefined) user.name     = name;
    if (linkedin !== undefined) user.linkedin = linkedin;
    if (github   !== undefined) user.github   = github;
    await user.save();

    // 2) Re-fetch without password
    const updated = await User.findById(req.userId).select("-password");

    res.json({ msg: "Profile updated", user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ————— POST /api/users/user/avatar — upload/update avatar —————
router.post(
  "/user/avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ msg: "No file uploaded" });
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ msg: "User not found" });

      // Compute absolute paths
      const newPath = req.file.path;                     // e.g. /…/uploads/avatars/user-123-avatar.jpg
      const oldPath =
        user.avatar && path.join(__dirname, "..", user.avatar);

      // Only delete if it exists *and* isn’t the same as the new file
      if (oldPath && fs.existsSync(oldPath) && oldPath !== newPath) {
        fs.unlinkSync(oldPath);
      }

      // Save the new avatar URL
      user.avatar = `/uploads/avatars/${req.file.filename}`;
      await user.save();
      res.json({ msg: "Avatar updated", avatarUrl: user.avatar });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

// ————— DELETE /api/users/user/avatar — remove avatar —————
router.delete("/user/avatar", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.avatar) {
      const fp = path.join(__dirname, "..", user.avatar);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      user.avatar = "";
      await user.save();
    }

    res.json({ msg: "Avatar removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;

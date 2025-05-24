const express = require("express");
const mongoose = require("mongoose");
const Pad = require("../models/Pad");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Middleware for authentication
const auth = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ msg: "No token, authorization denied" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};

// Create a pad and store it in MongoDB
router.post("/create", auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ msg: "Pad name is required" });
  try {
    const pad = new Pad({
      _id: new mongoose.Types.ObjectId(),
      name,
      users: [req.userId],
      roles: { [req.userId]: "pad_owner" },
    });
    await pad.save();
    res.json({ padId: pad._id.toString(), padName: pad.name, roles: pad.roles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get all pads of the authenticated user
router.get("/user-pads", auth, async (req, res) => {
  try {
    const pads = await Pad.find({ users: req.userId });
    res.json(pads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Add user to a pad with "editor" role
router.post("/add-user", auth, async (req, res) => {
  const { padId, userEmail } = req.body;
  try {
    const pad = await Pad.findById(padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });
    if (pad.roles.get(req.userId) !== "pad_owner") {
      return res.status(403).json({ msg: "Only pad owner can add users" });
    }
    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (pad.users.includes(user._id)) {
      return res.status(400).json({ msg: "User is already in the pad" });
    }
    pad.users.push(user._id);
    pad.roles.set(user._id.toString(), "editor");
    await pad.save();
    res.json({ msg: "User added as editor", pad });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get a single pad by ID (including sections, authors, references, paper fields)
router.get("/:padId", async (req, res) => {
  try {
    const pad = await Pad.findById(req.params.padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });
    res.json({
      name: pad.name,
      sections: pad.sections || [],
      authors: pad.authors || [],
      references: pad.references || [],
      users: pad.users || [],
      roles: pad.roles || {},
      title: pad.title || "",
      abstract: pad.abstract || "",
      keyword: pad.keyword || "",
    });
  } catch (err) {
    res.status(500).json({ msg: "Server Error", error: err });
  }
});

// Update entire pad (sections, authors, references, title, abstract, keyword)
router.post("/update-pad", auth, async (req, res) => {
  const { padId, sections, authors, references, title, abstract, keyword } = req.body;
  try {
    const pad = await Pad.findById(padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });
    sections.forEach((section) => {
      if (!section.content) {
        section.content = { ops: [] };
      }
      if (section.subsections) {
        section.subsections.forEach((sub) => {
          if (!sub.content) {
            sub.content = { ops: [] };
          }
        });
      }
    });
    pad.sections = sections;
    pad.authors = authors;
    pad.references = references;
    pad.title = title !== undefined ? title : pad.title;
    pad.abstract = abstract !== undefined ? abstract : pad.abstract;
    pad.keyword = keyword !== undefined ? keyword : pad.keyword;
    await pad.save();
    res.json({ msg: "Pad updated successfully", pad });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error", error: err });
  }
});

/*---------------------------------------------------------------------------------------------------------------------*/

// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Image Upload API
router.post("/uploads", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const imageUrl = `${process.env.APP_API_URL}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Get image-description pairs from a pad by padId
// In padRoutes.js
router.get("/:padId/images", async (req, res) => {
  try {
    const pad = await Pad.findById(req.params.padId);
    if (!pad) return res.status(404).json({ msg: "Pad not found" });

    let imagePairs = [];
    // Loop through sections and subsections to extract images:
    pad.sections.forEach((section) => {
      if (section.content && section.content.ops) {
        section.content.ops.forEach((op) => {
          if (op.insert && op.insert.imageWithCaption) {
            imagePairs.push({
              image_url: op.insert.imageWithCaption.src,
              image_description: op.insert.imageWithCaption.caption,
            });
          }
        });
      }
      if (section.subsections) {
        section.subsections.forEach((sub) => {
          if (sub.content && sub.content.ops) {
            sub.content.ops.forEach((op) => {
              if (op.insert && op.insert.imageWithCaption) {
                imagePairs.push({
                  image_url: op.insert.imageWithCaption.src,
                  image_description: op.insert.imageWithCaption.caption,
                });
              }
            });
          }
        });
      }
    });

    res.json({ imagePairs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/pads/:padId/save-citation
router.post("/:padId/save-citation", async (req, res) => {
  try {
    const { padId } = req.params;
    const { citation, author, title, journal, year, volume, number, pages } = req.body;

    const pad = await Pad.findById(padId).exec();
    if (!pad) {
      return res.status(404).json({ error: "Pad not found" });
    }

    const refId = `ref-${Date.now()}`;

    let nextKeyNumber = 1;
    if (pad.references.length > 0) {
      const numericKeys = pad.references
        .map((ref) => parseInt(ref.key, 10)) 
        .filter((num) => !isNaN(num));       
      if (numericKeys.length > 0) {
        nextKeyNumber = Math.max(...numericKeys) + 1;
      }
    }

    const newRef = {
      id: refId,
      key: nextKeyNumber.toString(),
      author: author || "Unknown Author",
      title: title || "Unknown Title",
      journal: journal || "Unknown Journal",
      year: year || "Unknown Year",
      volume: volume || "N/A",
      number: number || "N/A",
      pages: pages || "N/A",
      citation, 
    };

    pad.references.push(newRef);
    await pad.save();

    return res.json({
      message: "Citation saved successfully",
      reference: newRef, 
      references: pad.references,  
    });
  } catch (error) {
    console.error("❌ Error saving citation:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

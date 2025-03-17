const express = require('express');
const router = express.Router();
const Mindmap = require('../models/Mindmap');

// POST /api/mindmaps - Create a new mindmap
router.post('/', async (req, res) => {
  try {
    const { userId, nodes, links, image, downloadDate } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Create a new Mindmap document
    const newMindmap = new Mindmap({
      userId,
      nodes,
      links,
      image,
      downloadDate: downloadDate ? new Date(downloadDate) : new Date(),
    });

    const savedMindmap = await newMindmap.save();
    res.status(201).json({
      message: 'Mindmap saved successfully',
      mindmap: savedMindmap,
    });
  } catch (error) {
    console.error("Error saving mindmap:", error);
    res.status(500).json({
      message: "Error saving mindmap",
      error: error.message,
    });
  }
});

// GET /api/mindmaps - Get all mindmaps
router.get('/', async (req, res) => {
  try {
    const mindmaps = await Mindmap.find();
    res.status(200).json(mindmaps);
  } catch (error) {
    console.error("Error fetching mindmaps:", error);
    res.status(500).json({
      message: "Error fetching mindmaps",
      error: error.message,
    });
  }
});

// GET /api/mindmaps/:id - Get a mindmap by its ID
router.get('/:id', async (req, res) => {
  try {
    const mindmap = await Mindmap.findById(req.params.id);
    if (!mindmap) {
      return res.status(404).json({ message: "Mindmap not found" });
    }
    res.status(200).json(mindmap);
  } catch (error) {
    console.error("Error fetching mindmap by ID:", error);
    res.status(500).json({
      message: "Error fetching mindmap",
      error: error.message,
    });
  }
});

// GET /api/mindmaps/user/:userId - Get all mindmaps for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const mindmaps = await Mindmap.find({ userId: req.params.userId });
    res.status(200).json(mindmaps);
  } catch (error) {
    console.error("Error fetching mindmaps by userId:", error);
    res.status(500).json({
      message: "Error fetching mindmaps",
      error: error.message,
    });
  }
});

module.exports = router;

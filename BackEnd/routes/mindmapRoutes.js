const express = require('express');
const router = express.Router();
const Mindmap = require('../models/Mindmap');

// POST /api/mindmaps - Create a new mindmap
router.post('/', async (req, res) => {
  try {
    const { users, nodes, links, image, downloadDate } = req.body;

    // Ensure at least one user is provided.
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'At least one user is required.' });
    }

    const newMindmap = new Mindmap({
      users,
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
    const mindmaps = await Mindmap.find({ "users.userId": req.params.userId });
    res.status(200).json(mindmaps);
  } catch (error) {
    console.error("Error fetching mindmaps by userId:", error);
    res.status(500).json({
      message: "Error fetching mindmaps",
      error: error.message,
    });
  }
});

// PUT /api/mindmaps/:id - Update an existing mindmap by its ID
router.put('/:id', async (req, res) => {
  try {
    const { nodes, links, image } = req.body; // include image
    // Validate that nodes and links are provided (optional)
    if (!nodes || !links) {
      return res.status(400).json({ message: 'Nodes and links data are required.' });
    }
    
    // Find the mindmap by ID and update with new nodes, links, and image if provided
    const updateData = { nodes, links };
    if (image) {
      updateData.image = image;
    }
    
    const updatedMindmap = await Mindmap.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // Return the updated document
    );
    
    if (!updatedMindmap) {
      return res.status(404).json({ message: 'Mindmap not found' });
    }
    
    res.status(200).json({
      message: 'Mindmap updated successfully',
      mindmap: updatedMindmap,
    });
  } catch (error) {
    console.error("Error updating mindmap:", error);
    res.status(500).json({
      message: "Error updating mindmap",
      error: error.message,
    });
  }
});


// PUT /api/mindmaps/:id/addUser - Add a user to a mindmap
router.put('/:id/addUser', async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required.' });
    }
    
    const mindmap = await Mindmap.findById(req.params.id);
    if (!mindmap) {
      return res.status(404).json({ message: 'Mindmap not found.' });
    }
    
    // Check if user is already added
    const userExists = mindmap.users.some(u => u.userId.toString() === userId);
    if (userExists) {
      return res.status(400).json({ message: 'User already exists in this mindmap.' });
    }
    
    // Add the new user with provided role (or default to 'editor')
    mindmap.users.push({
      userId,
      role: role || 'editor'
    });
    
    const updatedMindmap = await mindmap.save();
    res.status(200).json({
      message: 'User added successfully',
      mindmap: updatedMindmap,
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({
      message: "Error adding user",
      error: error.message,
    });
  }
});

module.exports = router;

const mongoose = require('mongoose');

const MindmapSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User'  // assuming you have a User model
  },
  nodes: { type: Array, required: true },
  links: { type: Array, required: true },
  image: { type: String, required: true }, // base64 PNG data
  downloadDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Mindmap', MindmapSchema);

const mongoose = require("mongoose");

const SubsectionSchema = new mongoose.Schema({
  id: String,
  title: String,
  contentId: String,
  content: { type: Object, default: { ops: [] } },
  aiEnhancement: { type: Boolean, default: false },
});

const SectionSchema = new mongoose.Schema({
  id: String,
  title: String,
  contentId: String,
  content: { type: Object, default: { ops: [] } },
  subsections: [SubsectionSchema],
  aiEnhancement: { type: Boolean, default: false },
  tags: { type: [String], default: [] },
});


const ReferenceSchema = new mongoose.Schema({
  id: String,
  key: String,       // e.g., "example2023"
  author: String,    // e.g., "John Doe and Jane Smith"
  title: String,     // e.g., "A Study on NLP Style Transfer"
  journal: String,   // e.g., "Journal of NLP"
  year: String,      // e.g., "2023"
  volume: String,    // e.g., "10"
  number: String,    // e.g., "2"
  pages: String,     // e.g., "100-110"
  citation: String,
});

const ContributorSchema = new mongoose.Schema({
  id: String,
  name: String,
  affiliation: String,
  email: String,
  position: { type: String, default: "" },
  about: { type: String, default: "" },
  bio: { type: String, default: "" },
  profilePicture: { type: String, default: "" }, // Store profile picture URL
});

const PadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  roles: { type: Map, of: String },
  title: { type: String, default: "" },
  abstract: { type: String, default: "" },
  keyword: { type: String, default: "" },
  sections: [SectionSchema],
  authors: [{
    id: String,
    name: String,
    affiliation: String,
    email: String,
    bio: String,
  }],
  references: [ReferenceSchema]
}, {
  versionKey: false,             // disable __v
  optimisticConcurrency: false   // disable version checks
});

module.exports = mongoose.model("Pad", PadSchema);


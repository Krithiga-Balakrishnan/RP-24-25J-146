// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  email:          { type: String, unique: true, required: true, lowercase: true, trim: true },
  password:       { type: String },
  linkedin:       { type: String, default: "" },
  github:         { type: String, default: "" },
  avatar:         { type: String, default: "" },  // will hold a URL or file path
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model("User", UserSchema);

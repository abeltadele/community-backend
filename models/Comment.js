// models/Comment.js
// Comments linked to issues.

const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    issue:  { type: mongoose.Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text:   { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);

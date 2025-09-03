// models/Issue.js
// Issue schema supports text search and geospatial queries (Point).
// Also keeps a history of status changes for auditing.

const mongoose = require("mongoose");

const statusEnum = ["pending", "in-progress", "resolved"];

const issueSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, text: true },
    description: { type: String, required: true, text: true },
    images:      [{ url: String, publicId: String }],
    status:      { type: String, enum: statusEnum, default: "pending", index: true },

    // GeoJSON Point for location queries
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere", default: [0, 0] }, // [lng, lat]
      address: { type: String, default: "" }
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional

    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // for notifications

    history: [
      {
        from: { type: String, enum: statusEnum },
        to:   { type: String, enum: statusEnum },
        at:   { type: Date, default: Date.now },
        by:   { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Issue", issueSchema);

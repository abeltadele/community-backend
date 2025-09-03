// controllers/commentController.js
// Create and list comments for an issue.

const { body, param, validationResult } = require("express-validator");
const Comment = require("../models/Comment");
const Issue = require("../models/Issue");

const createCommentValidators = [
  param("issueId").isMongoId().withMessage("Invalid issue ID"),
  body("text").trim().notEmpty().withMessage("Text is required")
];

const createComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { text } = req.body;
  const { issueId } = req.params;

  try {
    const exists = await Issue.findById(issueId);
    if (!exists) return res.status(404).json({ message: "Issue not found" });

    const comment = await Comment.create({
      issue: issueId,
      author: req.userId,
      text
    });

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const listCommentsValidators = [ param("issueId").isMongoId().withMessage("Invalid issue ID") ];

const listComments = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const items = await Comment.find({ issue: req.params.issueId })
      .populate("author", "username")
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createCommentValidators,
  listCommentsValidators,
  createComment,
  listComments
};

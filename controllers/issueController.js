// controllers/issueController.js
// CRUD, filtering, geospatial search, status change with email notification.

const { query, body, validationResult, param } = require("express-validator");
const Issue = require("../models/Issue");
const User = require("../models/User");
const { sendEmail } = require("../utils/email");

// Validation rules
const validateCreateIssue = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("lat").optional().isFloat({ min: -90, max: 90 }).withMessage("Invalid lat"),
  body("lng").optional().isFloat({ min: -180, max: 180 }).withMessage("Invalid lng"),
  body("address").optional().isString()
];

const validateIdParam = [ param("id").isMongoId().withMessage("Invalid ID") ];

const createIssue = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, lat, lng, address } = req.body;

  try {
    const images =
      (req.files || []).map(f => ({
        url: f.path || "",        // when cloudinary is configured, multer gives .path
        publicId: f.filename || "" // Cloudinary public ID
      }));

    const issue = await Issue.create({
      title,
      description,
      images,
      location: {
        type: "Point",
        coordinates: (lng && lat) ? [Number(lng), Number(lat)] : [0, 0],
        address: address || ""
      },
      createdBy: req.userId,
      watchers: [req.userId] // reporter auto-watches
    });

    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/issues?status=&q=&page=&limit=&lng=&lat=&radius=
const listIssuesValidators = [
  query("status").optional().isIn(["pending","in-progress","resolved"]),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("lng").optional().isFloat({ min: -180, max: 180 }),
  query("lat").optional().isFloat({ min: -90, max: 90 }),
  query("radius").optional().isInt({ min: 1 }) // meters
];

const listIssues = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    status,
    q,
    page = 1,
    limit = 10,
    lng,
    lat,
    radius
  } = req.query;

  const filter = {};
  if (status) filter.status = status;

  // Text search
  if (q) {
    filter.$text = { $search: q };
  }

  // Geo near search (if coords + radius provided)
  if (lng && lat && radius) {
    filter.location = {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius)
      }
    };
  }

  try {
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Issue.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Issue.countDocuments(filter)
    ]);

    res.json({
      items,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getIssue = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const issue = await Issue.findById(req.params.id).populate("createdBy", "username email role");
    if (!issue) return res.status(404).json({ message: "Issue not found" });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Only creator or admin can update text fields; status changes handled separately.
const updateIssueValidators = [
  ...validateIdParam,
  body("title").optional().trim().notEmpty(),
  body("description").optional().trim().notEmpty(),
  body("address").optional().isString(),
  body("lat").optional().isFloat({ min: -90, max: 90 }),
  body("lng").optional().isFloat({ min: -180, max: 180 })
];

const updateIssue = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const isOwner = issue.createdBy.toString() === req.userId;
    const isAdmin = req.userRole === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

    const { title, description, lat, lng, address } = req.body;

    if (title) issue.title = title;
    if (description) issue.description = description;
    if (address || lat || lng) {
      issue.location = {
        type: "Point",
        coordinates: (lng && lat) ? [Number(lng), Number(lat)] : issue.location.coordinates,
        address: address ?? issue.location.address
      };
    }

    // Handle new images if uploaded
    const newImages = (req.files || []).map(f => ({
      url: f.path || "",
      publicId: f.filename || ""
    }));
    if (newImages.length) issue.images.push(...newImages);

    await issue.save();
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin-only status update (sends email to watchers)
const statusValidators = [
  ...validateIdParam,
  body("status").isIn(["pending","in-progress","resolved"]).withMessage("Invalid status")
];

const updateStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const issue = await Issue.findById(req.params.id).populate("watchers", "email username");
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const from = issue.status;
    const to = req.body.status;

    if (from === to) return res.json(issue);

    issue.status = to;
    issue.history.push({ from, to, by: req.userId });

    await issue.save();

    // Notify watchers (optional)
    const recipients = (issue.watchers || []).map(w => w.email).filter(Boolean);
    if (recipients.length) {
      await sendEmail({
        to: recipients.join(","),
        subject: `Issue "${issue.title}" status updated: ${to}`,
        html: `<p>Status changed from <b>${from}</b> to <b>${to}</b>.</p>`
      });
    }

    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete issue (owner or admin)
const deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const isOwner = issue.createdBy.toString() === req.userId;
    const isAdmin = req.userRole === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

    await issue.deleteOne();
    res.json({ message: "Issue deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  validateCreateIssue,
  listIssuesValidators,
  updateIssueValidators,
  statusValidators,
  validateIdParam,
  createIssue,
  listIssues,
  getIssue,
  updateIssue,
  updateStatus,
  deleteIssue
};

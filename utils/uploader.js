// utils/uploader.js
// Multer + Cloudinary storage for image uploads

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// If Cloudinary not configured, fallback to memory (no-op) to avoid crashes.
const storage = (cloudinary.config().cloud_name && cloudinary.config().api_key)
  ? new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder: "community-issues",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
      })
    })
  : multer.memoryStorage();

const upload = multer({ storage });

module.exports = { upload, cloudinary };

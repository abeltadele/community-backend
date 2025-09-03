import express from "express";

const router = express.Router();

// example routes
router.post("/register", (req, res) => {
  // ...existing code...
  res.json({ message: "register endpoint" });
});

router.post("/login", (req, res) => {
  // ...existing code...
  res.json({ message: "login endpoint" });
});

export default router;
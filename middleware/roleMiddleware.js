// middleware/roleMiddleware.js
// Ensures a user has admin role for certain operations.

const requireAdmin = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin only" });
  }
  next();
};

module.exports = requireAdmin;

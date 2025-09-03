// middleware/authMiddleware.js
// Verifies JWT and attaches req.userId & req.userRole

const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Not authorized: missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized: invalid token" });
  }
};

module.exports = auth;

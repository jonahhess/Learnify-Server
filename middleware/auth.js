const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Get token from cookie
  const token = req.cookies.token;

  // Check if not token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    req.user = decoded;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

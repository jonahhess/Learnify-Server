const mongoose = require("mongoose");

const mongoReady = (req, res, next) => {
  // Keep health checks available even when MongoDB is down.
  if (req.path === "/health") {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message:
        "Database unavailable. Check MongoDB Atlas IP access list and MONGO_URI.",
    });
  }

  next();
};

module.exports = { mongoReady };

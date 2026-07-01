require("dotenv").config();
const express = require("express");
const connectDB = require("./db");
const logger = require("./middleware/logger");
const limiter = require("./middleware/rateLimiter");
const apiRoutes = require("./routes/api");
const { errorHandler } = require("./middleware/errorHandler");
const path = require("path");

const cookieParser = require("cookie-parser");

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());

app.use(logger);
app.use(limiter);

connectDB();

app.use("/", apiRoutes);

// 2. Serve React static assets
app.use(express.static(path.join(__dirname, "dist")));

// 3. Handle React Routing (SPA fallback)
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.use(errorHandler);

app.listen(process.env.PORT || 4000, () =>
  console.log(`Server running on port ${process.env.PORT || 4000}`),
);

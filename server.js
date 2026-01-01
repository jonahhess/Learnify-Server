require("dotenv").config();
const express = require("express");
const connectDB = require("./db");
const logger = require("./middleware/logger");
const limiter = require("./middleware/rateLimiter");
const apiRoutes = require("./routes/api");
const { errorHandler } = require("./middleware/errorHandler");

const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
app.set("trust proxy", 1);

const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//app.options("*", cors());

app.use(express.json());
app.use(cookieParser());

app.use(logger);
app.use(limiter);

connectDB();

app.use("/", apiRoutes);

app.use(errorHandler);

app.listen(process.env.PORT || 4000, () =>
  console.log(`Server running on port ${process.env.PORT || 4000}`)
);

const express = require("express");
const router = express.Router();

const userRoutes = require("./users");
const courseRoutes = require("./courses");
const coursewareRoutes = require("./coursewares");
const reviewCardRoutes = require("./reviewCards");
const questionRoutes = require("./questions");
const aiRoutes = require("./ai");

router.use("/users", userRoutes);
router.use("/courses", courseRoutes);
router.use("/coursewares", coursewareRoutes);
router.use("/review-cards", reviewCardRoutes);
router.use("/questions", questionRoutes);
router.use("/ai", aiRoutes);

router.get("/health", (req, res) => {
  res.send("OK");
});

module.exports = router;

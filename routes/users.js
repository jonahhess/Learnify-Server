const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const validateNewUser = require("../middleware/validateNewUser");
const {
  createUser,
  loginUser,
  getUserById,
  getMe,
  updateUser,
  deleteUser,
  startCourse,
  startCourseware,
  submitCourseware,
  batchSubmitReviewCards,
} = require("../controllers/userController");
const validateUser = require("../middleware/validateUser");

// Create a new user
router.post("/", validateNewUser, createUser);

// Login a user
router.post("/login", loginUser);

// get me
router.get("/me", auth, getMe);

// interacting with the app

// Add Course to user by Id
router.post("/:id/courses", auth, startCourse);

// Submit Courseware by id
router.put(
  "/:id/coursewares/:coursewareId",
  auth,
  validateUser,
  submitCourseware
);

// Start Courseware by Id
router.post("/:id/coursewares", auth, validateUser, startCourseware);

// Submit Review Cards
router.post("/:id/reviewcards", auth, validateUser, batchSubmitReviewCards);

// end of app section

// Get a user by ID
router.get("/:id", auth, validateUser, getUserById);

// Update a user by ID
router.put("/:id", auth, validateUser, updateUser);

// Delete a user by ID
router.delete("/:id", auth, validateUser, deleteUser);

module.exports = router;

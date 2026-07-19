const ReviewCard = require("../models/reviewCards");
const User = require("../models/users");

// Create a new review card
exports.createReviewCard = async (req, res) => {
  try {
    const { courseId, question, nextReviewDate } = req.body;
    const newReviewCard = new ReviewCard({
      courseId,
      userId: req.userId,
      question,
      nextReviewDate,
    });
    await newReviewCard.save();
    res.status(201).json({
      message: "Review card created successfully",
      reviewCard: newReviewCard,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all review cards for a user
exports.getAllReviewCards = async (req, res) => {
  try {
    const reviewCards = await ReviewCard.find({ userId: req.userId });
    res.json(reviewCards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a review card by ID
exports.getReviewCardById = async (req, res) => {
  try {
    const reviewCard = await ReviewCard.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!reviewCard)
      return res.status(404).json({ message: "Review card not found" });
    res.json(reviewCard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a review card by ID
exports.updateReviewCard = async (req, res) => {
  try {
    const reviewCard = await ReviewCard.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true },
    );
    if (!reviewCard)
      return res.status(404).json({ message: "Review card not found" });
    res.json(reviewCard);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a review card by ID
exports.deleteReviewCard = async (req, res) => {
  try {
    const reviewCard = await ReviewCard.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!reviewCard)
      return res.status(404).json({ message: "Review card not found" });

    await User.updateOne(
      { _id: req.userId },
      {
        $pull: {
          myReviewCards: {
            $or: [
              { _id: reviewCard._id },
              { questionId: reviewCard.questionId },
            ],
          },
        },
      },
    );

    res.json({ message: "Review card deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

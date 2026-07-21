const User = require("../models/users");
const Course = require("../models/courses");
const Courseware = require("../models/coursewares");
const ReviewCard = require("../models/reviewCards");
const { doGenerateCourseware } = require("./aiController");
const mongoose = require("mongoose");

const jwt = require("jsonwebtoken");

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const newUser = new User({ name, email, password });
    await newUser.save();

    const payload = { userId: newUser._id }; // optionally add role: newUser.role
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: true, // Use secure cookies in production
        sameSite: "none",
        maxAge: 3600000, // 1 hour
        path: "/",
      })
      .status(201)
      .json({ message: "User created successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Login a user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = { userId: user._id }; // optionally add role: user.role
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: true, // Use secure cookies in production
        sameSite: "none",
        maxAge: 3600000, // 1 hour
        path: "/",
      })
      .json({ message: "Logged in successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.logout = (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/", // MUST match login cookie
    })
    .json({ message: "Logged out successfully" });
};

// Get a user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a user by ID
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a user by ID
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.userId).select("_id name email");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
};

// interacting with the app data

// start a course by ID
exports.startCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.body.id);

    if (!course) return res.status(404).json({ message: "Course not found" });
    const courseId = course._id;
    const title = course.title;
    const length = course.coursewares?.length;
    if (length) {
      const firstCourseware = course.coursewares[0];
      const coursewareTitle = firstCourseware.title;
      if (!firstCourseware.coursewareId)
        doGenerateCourseware(title, courseId, coursewareTitle);
    }

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.userId,
        myCurrentCourses: { $not: { $elemMatch: { courseId } } },
        $expr: { $lt: [{ $size: "$myCurrentCourses" }, 5] },
      },
      {
        $push: {
          myCurrentCourses: { courseId, title, length },
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      const user = await User.findById(req.userId).select(
        "_id myCurrentCourses",
      );
      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found. This is awkward" });
      }
      if (user.myCurrentCourses.some((c) => c.courseId.equals(courseId))) {
        return res.status(400).json({ message: "Course already exists!" });
      }
      if (user.myCurrentCourses.length >= 5) {
        return res.status(400).json({ message: "Too many courses" });
      }
      return res
        .status(409)
        .json({ message: "Failed to start course due to concurrent update" });
    }

    res.status(200).json("added course successfully");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// stop a course by ID
exports.stopCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.body.id);

    if (!course) return res.status(404).json({ message: "Course not found" });
    const courseId = course._id;

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.userId,
        myCurrentCourses: { $elemMatch: { courseId } },
      },
      {
        $pull: {
          myCurrentCourses: { courseId },
        },
      },
    );

    if (!updatedUser) {
      const user = await User.findById(req.userId).select(
        "_id myCurrentCourses",
      );
      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found. This is awkward" });
      }
      if (user.myCurrentCourses.every((c) => !c.courseId.equals(courseId))) {
        return res
          .status(400)
          .json({ message: "user not enrolled in course!" });
      }
      return res
        .status(409)
        .json({ message: "Failed to stop course due to concurrent update" });
    }

    res.status(200).json("removed course successfully");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// start a courseware by ID
exports.startCourseware = async (req, res) => {
  try {
    let courseware = await Courseware.findById(req.params.coursewareId);

    if (!courseware) {
      const course = await Course.findOne({
        $or: [
          { "coursewares._id": req.params.coursewareId },
          { "coursewares.coursewareId": req.params.coursewareId },
        ],
      });
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const outlineEntry = course.coursewares.find(
        (cw) =>
          cw._id?.toString() === req.params.coursewareId ||
          cw.coursewareId?.toString() === req.params.coursewareId,
      );
      if (!outlineEntry) {
        return res.status(404).json({ message: "Courseware not found" });
      }

      const courseTitle = course.title;
      const courseId = course._id;
      const title = outlineEntry.title;
      courseware = await doGenerateCourseware(courseTitle, courseId, title);
    }
    // test if course exists
    const courseId = courseware.courseId;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // test if courseware index is the same as the course.coursware index
    // by comparing their ObjectId fields
    // seems very extra. worthwhile to figure out if mismatch can ever occur
    const coursewareId = courseware._id;
    const coursewares = course?.coursewares;
    let index = coursewares?.findIndex(
      (c) => c.coursewareId?.toString() === coursewareId.toString(),
    );
    if (index === -1 || index === undefined) {
      if (Number.isInteger(courseware.index) && courseware.index >= 0) {
        index = courseware.index;
      } else {
        return res.status(409).json({
          message: "Courseware index is missing from course outline",
        });
      }
    }

    const user = await User.findById(req.userId).select(
      "_id myCurrentCourses myCompletedCoursewares",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.myCurrentCourses.some((c) => c.courseId.equals(courseId))) {
      return res
        .status(400)
        .json({ message: "Cannot start courseware before starting course" });
    }

    if (
      user.myCompletedCoursewares.some((c) =>
        c.coursewareId.equals(coursewareId),
      )
    ) {
      return res.status(204).json({ message: "courseware already completed" });
    }

    // async start generating the next courseware while user is working on current
    const nextIndex = index + 1;
    const nextCourseware = coursewares?.[nextIndex];
    if (nextCourseware && !nextCourseware.coursewareId) {
      const now = new Date();
      const leaseUntil = new Date(now.getTime() + 10 * 60 * 1000);
      const generationToken = new mongoose.Types.ObjectId();
      const basePath = `coursewares.${nextIndex}`;

      const reserveFilter = {
        _id: courseId,
        [`${basePath}.coursewareId`]: { $exists: false },
        $or: [{ [`${basePath}.generationLeaseUntil`]: { $lte: now } }],
      };
      const reserveUpdate = {
        $set: {
          [`${basePath}.generationLeaseUntil`]: leaseUntil,
          [`${basePath}.generationToken`]: generationToken,
        },
      };

      // Use an expiring lease token so stale workers do not lock this slot forever.
      const reserved = await Course.findOneAndUpdate(
        reserveFilter,
        reserveUpdate,
      );

      if (reserved) {
        doGenerateCourseware(course.title, courseId, nextCourseware.title)
          .then(async () => {
            await Course.updateOne(
              {
                _id: courseId,
                [`${basePath}.generationToken`]: generationToken,
              },
              {
                $unset: {
                  [`${basePath}.generationLeaseUntil`]: "",
                  [`${basePath}.generationToken`]: "",
                },
              },
            );
          })
          .catch(async (generationErr) => {
            console.error("Failed to generate next courseware", generationErr);
            await Course.updateOne(
              {
                _id: courseId,
                [`${basePath}.generationToken`]: generationToken,
              },
              {
                $unset: {
                  [`${basePath}.generationLeaseUntil`]: "",
                  [`${basePath}.generationToken`]: "",
                },
              },
            );
          });
      }
    }

    res.status(200).json("added courseware successfully");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// submit a courseware by ID
exports.submitCourseware = async (req, res) => {
  try {
    const [user, courseware] = await Promise.all([
      User.findById(req.userId),
      Courseware.findById(req.params.coursewareId),
    ]);

    if (!user)
      return res
        .status(500)
        .json({ message: "user not found. This is awkward" });
    if (!courseware)
      return res.status(404).json({ message: "Courseware not foundxx" });

    const courseId = courseware.courseId;
    const coursewareId = courseware._id;

    if (!user.myCurrentCourses.some((c) => c.courseId.equals(courseId))) {
      return res
        .status(400)
        .json({ message: "Cannot submit courseware before starting course" });
    }

    if (
      user.myCompletedCoursewares.some((c) =>
        c.coursewareId.equals(coursewareId),
      )
    ) {
      return res.status(204).json({ message: "courseware already submitted" });
    }

    const title = courseware.title;
    const index = courseware.index;
    user.myCompletedCoursewares.push({ courseId, coursewareId, title, index });

    // check if user finished the course - if so move course to completed
    const course = await Course.findById(courseId);
    const courseTitle = course.title;
    const length = course.coursewares?.length;
    const lengthCompletedCoursewaresOfCourse =
      user.myCompletedCoursewares.filter((c) =>
        c.courseId.equals(courseId),
      ).length;

    if (length === lengthCompletedCoursewaresOfCourse) {
      // completed the course! congrats
      user.myCompletedCourses.push({ title: courseTitle, courseId, length });
      user.myCurrentCourses = user.myCurrentCourses.filter(
        (c) => !c.courseId.equals(courseId),
      );
    }

    const quiz = courseware.quiz.map((q) => q.questionId);
    const userId = req.userId;
    const nextReviewDate = new Date();

    const promises = [user.save()];
    for (const questionId of quiz) {
      promises.push(
        ReviewCard.create({
          questionId,
          courseId,
          coursewareId,
          userId,
          reviews: 0,
          successes: 0,
          nextReviewDate,
        }),
      );
    }

    await Promise.all(promises);
    res.status(201).json("submitted courseware successfully");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// helper fn for review cards
const performReview = async (reviewCard, success) => {
  reviewCard.reviews = reviewCard.reviews ? reviewCard.reviews + 1 : 1;
  reviewCard.successes = reviewCard.successes
    ? reviewCard.successes + !!success
    : !!success;
  const add = Math.min(Math.max(reviewCard.successes * 2, 1), 365);
  const oldReviewDate = new Date(reviewCard.nextReviewDate);
  const nextReviewDate = oldReviewDate.setDate(oldReviewDate.getDate() + add);
  reviewCard.nextReviewDate = nextReviewDate;
  reviewCard.save();
};

// batch review cards by ID
exports.batchSubmitReviewCards2 = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    // error handling
    if (!user)
      return res
        .status(500)
        .json({ message: "user not found. This is awkward" });

    // {reviewedCards: [{questionId, success: 0}, {questionId, success: 1}]}

    const myReviewCards = user.myReviewCards;
    const { reviewedCards } = req.body; // [{questionId: '...', success: 1}, {_id: "...", success: 0}]

    if (reviewedCards.length > myReviewCards.length) {
      return res
        .status(400)
        .json({ message: "too many cards reviewed. something is wrong" });
    }

    // array of relevant cards
    const reviewCards = await ReviewCard.find({
      questionId: { $in: reviewedCards.map((c) => c.questionId) },
      userId: req.userId,
    });

    for (const card of reviewCards) {
      performReview(
        card,
        !!reviewedCards.find((rc) => rc.questionId === card._id.toString())
          ?.success,
      );
    }

    const idsReviewed = reviewCards.map((rc) => rc.questionId.toString());
    const reviewCardsExceptFinished = myReviewCards.filter(
      (rc) => !idsReviewed.includes(rc.questionId.toString()),
    );
    user.myReviewCards = reviewCardsExceptFinished;

    await user.save();

    res.status(200).json("reviewed cards successfully");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.batchSubmitReviewCards = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res
        .status(500)
        .json({ message: "user not found. This is awkward" });
    }

    const myReviewCards = user.myReviewCards;
    const { reviewedCards } = req.body; // [{ _id: '...', success: 1/0 }]

    if (reviewedCards.length > myReviewCards.length) {
      return res
        .status(400)
        .json({ message: "too many cards reviewed. something is wrong" });
    }

    // find relevant cards
    const reviewCards = await ReviewCard.find({
      _id: { $in: reviewedCards.map((c) => c._id) },
      userId: req.userId,
    });

    // build bulk update operations
    const ops = reviewCards
      .map((card) => {
        const match = reviewedCards.find(
          (rc) => rc._id === card._id.toString(),
        );
        if (!match) return null;

        // let performReview calculate updated values
        const updated = performReview(card, !!match.success);

        return {
          updateOne: {
            filter: { _id: card._id },
            update: {
              $set: {
                reviews: updated.reviews,
                successes: updated.successes,
                nextReviewDate: updated.nextReviewDate,
                updatedAt: new Date(),
              },
            },
          },
        };
      })
      .filter(Boolean);

    if (ops.length) {
      await ReviewCard.bulkWrite(ops);
    }

    // remove reviewed cards from user.myReviewCards
    const idsReviewed = reviewedCards.map((rc) => rc._id.toString());
    user.myReviewCards = myReviewCards.filter(
      (rc) => !idsReviewed.includes(rc._id.toString()),
    );

    await user.save();

    res.status(200).json("reviewed cards successfully");
  } catch (err) {
    console.error("Batch review error:", err);
    res.status(400).json({ message: err.message });
  }
};

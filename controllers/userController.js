const User = require("../models/users");
const Course = require("../models/courses");
const Courseware = require("../models/coursewares");
const ReviewCard = require("../models/reviewCards");
const { doGenerateCourseware } = require("./aiController");

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
        secure: false, // Use secure cookies in production
        sameSite: "lax",
        maxAge: 3600000, // 1 hour
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
        secure: false, // Use secure cookies in production
        sameSite: "strict",
        maxAge: 3600000, // 1 hour
        path: "/",
      })
      .json({ message: "Logged in successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
    const [user, course] = await Promise.all([
      User.findById(req.user._id),
      Course.findById(req.body.id),
    ]);

    // error handling
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!user)
      return res
        .status(500)
        .json({ message: "user not found. This is awkward" });

    if (user.myCurrentCourses.some((c) => c.courseId.equals(course._id))) {
      return res.status(400).json({ message: "course already exists!" });
    }
    if (user.myCurrentCourses.length >= 5) {
      return res.status(400).json({ message: "Too many courses" });
    }

    // assigning course to user
    const courseId = course._id;
    const title = course.title;
    const length = course.coursewares?.length;

    user.myCurrentCourses.push({ courseId, title, length });

    if (length) {
      const firstCourseware = course.coursewares[0];
      const coursewareTitle = firstCourseware.title;

      const entry = {
        courseId,
        title: coursewareTitle,
        index: 0,
        coursewareId:
          firstCourseware._doc.coursewareId ||
          (await doGenerateCourseware(title, courseId, coursewareTitle)._id),
      };

      user.myCurrentCoursewares.push(entry);
    }

    await user.save();
    res.send("added course successfully");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// start a courseware by ID
exports.startCourseware = async (req, res) => {
  try {
    const [user, courseware] = await Promise.all([
      User.findById(req.user._id),
      Courseware.findById(req.body.id),
    ]);

    // error handling
    if (!courseware)
      return res.status(404).json({ message: "Courseware not found" });
    if (!user)
      return res
        .status(500)
        .json({ message: "user not found. This is awkward" });

    if (
      user.myCurrentCoursewares.some((c) =>
        c.coursewareId.equals(courseware._id)
      )
    ) {
      return res.status(400).json({ message: "courseware already exists!" });
    }
    if (user.myCurrentCoursewares.length >= 15) {
      return res.status(400).json({ message: "Too many coursewares" });
    }

    if (
      !user.myCurrentCourses.some((c) => c.courseId.equals(courseware.courseId))
    ) {
      return res
        .status(400)
        .json({ message: "Cannot start courseware before starting course" });
    }

    // assigning course to user
    const courseId = courseware.courseId;
    const coursewareId = courseware._id;
    const title = courseware.title;
    const length = course.coursewares?.length;

    // find index of course if exists
    const course = await Course.findById(courseId);
    const coursewares = course?.coursewares;
    const index = coursewares?.findIndex(
      (c) => c.coursewareId === req.params.id || c.title === title
    );

    if (length) {
      user.myCurrentCoursewares.push({
        courseId,
        coursewareId,
        title,
        index,
      });
    }

    await user.save();

    res.send("added courseware successfully");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// submit a courseware by ID
exports.submitCourseware = async (req, res) => {
  try {
    const [user, courseware] = await Promise.all([
      User.findById(req.user._id),
      Courseware.findById(req.params.coursewareId),
    ]);

    if (!user)
      return res
        .status(500)
        .json({ message: "user not found. This is awkward" });
    if (!courseware)
      return res.status(404).json({ message: "Courseware not found" });

    if (
      !user.myCurrentCoursewares.some(
        (c) => c._doc.coursewareId?.toString() === req.params.coursewareId
      )
    ) {
      return res
        .status(400)
        .json({ message: "courseware not registered for user" });
    }

    const courseId = courseware.courseId;
    const coursewareId = courseware._id;
    const title = courseware.title;
    const index = courseware._doc.index;

    // move courseware from current to completed

    const coursewaresExceptCurrent = user.myCurrentCoursewares.filter(
      (c) => !c.coursewareId?.equals(coursewareId)
    );

    user.myCurrentCoursewares = coursewaresExceptCurrent;
    user.myCompletedCoursewares.push({ courseId, coursewareId, title, index });

    // check if user finished the course - if so move course to completed
    const course = await Course.findById(courseId);
    const courseTitle = course.title;
    const length = course.coursewares?.length;
    const lengthCompletedCoursewaresOfCourse =
      user.myCompletedCoursewares.filter((c) =>
        c.courseId.equals(courseId)
      ).length;

    if (length === lengthCompletedCoursewaresOfCourse) {
      // completed the course! congrats
      user.myCompletedCourses.push({ title: courseTitle, courseId, length });
      user.myCurrentCourses = user.myCurrentCourses.filter(
        (c) => c.courseId !== courseId
      );
    } else {
      const nextIndex = index + 1;
      const nextCourseware = course.coursewares[nextIndex];
      const title = nextCourseware.title;

      const entry = {
        title,
        courseId,
        index: nextIndex,
        coursewareId:
          nextCourseware.coursewareId ||
          (await doGenerateCourseware(courseTitle, courseId, title)._id),
      };

      // if (!entry.coursewareId) {
      //   throw {message: "failed to create new courseware"}
      //   }

      user.myCurrentCoursewares.push(entry);
    }

    const quiz = courseware.quiz.map((q) => q.questionId);
    const userId = req.user._id;
    const now = new Date();
    const nextReviewDate = now.setDate(now.getDate() + 1);

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
        })
      );
    }

    await Promise.all(promises);

    let correctFlag = false;
    for (let i = 0; !correctFlag && i < 20; i++) {
      const testUser = await User.findById(req.user._id);
      correctFlag = testUser.myCurrentCourses.some((c) =>
        c.coursewareId?.equals(entry.coursewareId)
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    res.send("submitted courseware successfully");
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
    const user = await User.findById(req.user._id);

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
      userId: req.user._id,
    });

    for (const card of reviewCards) {
      performReview(
        card,
        !!reviewedCards.find((rc) => rc.questionId === card._id.toString())
          ?.success
      );
    }

    const idsReviewed = reviewCards.map((rc) => rc.questionId.toString());
    const reviewCardsExceptFinished = myReviewCards.filter(
      (rc) => !idsReviewed.includes(rc.questionId.toString())
    );
    user.myReviewCards = reviewCardsExceptFinished;

    await user.save();

    res.send("reviewed cards successfully");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.batchSubmitReviewCards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

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
      userId: req.user._id,
    });

    // build bulk update operations
    const ops = reviewCards
      .map((card) => {
        const match = reviewedCards.find(
          (rc) => rc._id === card._id.toString()
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
      (rc) => !idsReviewed.includes(rc._id.toString())
    );

    await user.save();

    res.send("reviewed cards successfully");
  } catch (err) {
    console.error("Batch review error:", err);
    res.status(400).json({ message: err.message });
  }
};

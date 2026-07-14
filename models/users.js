const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    myCurrentCourses: {
      type: [
        {
          courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
          title: String,
        },
      ],
      default: [],
    },
    myCompletedCourses: {
      type: [
        {
          courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
          title: String,
        },
      ],
      default: [],
    },
    myCompletedCoursewares: {
      type: [
        {
          coursewareId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Courseware",
          },
          title: String,
          courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
          index: Number,
        },
      ],
      default: [],
    },
    myReviewCards: {
      type: [
        {
          type: mongoose.Schema.Types.Mixed,
          ref: "ReviewCard",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("users", UserSchema);

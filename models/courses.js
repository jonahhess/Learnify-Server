const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    coursewares: [
      {
        coursewareId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Courseware",
        },
        title: { type: String, required: true },
        generationState: {
          type: String,
          enum: ["idle", "generating", "ready"],
          default: "idle",
        },
        generationLeaseUntil: {
          type: Date,
        },
        generationToken: {
          type: mongoose.Schema.Types.ObjectId,
        },
      },
    ],
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    description: {
      type: String,
    },
    keywords: {
      type: [String],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("courses", courseSchema);

const Course = require("../models/courses");
const mongoose = require("mongoose");

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const { title } = req.body;
    const coursewares = req.body.coursewares || [];
    const newCourse = new Course({ title, coursewares });
    await newCourse.save();

    // add the course to the user's myCourses array
    req.user.myCurrentCourses.push({
      id: newCourse._id,
      title: newCourse.title,
    });
    await req.user.save();

    res
      .status(201)
      .json({ message: "Course created successfully", course: newCourse });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const {
      page = "1",
      limit = "25",
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      keyword,
      all,
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "title",
      "views",
      "likes",
    ];
    const normalizedSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const normalizedSortOrder = sortOrder === "asc" ? 1 : -1;

    const query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (keyword) {
      query.keywords = keyword;
    }

    const sort = { [normalizedSortBy]: normalizedSortOrder };

    if (all === "true") {
      const courses = await Course.find(query).sort(sort).lean();

      return res.json({
        data: courses,
        meta: {
          total: courses.length,
          page: 1,
          limit: courses.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          sortBy: normalizedSortBy,
          sortOrder: sortOrder === "asc" ? "asc" : "desc",
          filters: {
            search: search || null,
            keyword: keyword || null,
          },
        },
      });
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const [courses, total] = await Promise.all([
      Course.find(query).sort(sort).skip(skip).limit(parsedLimit).lean(),
      Course.countDocuments(query),
    ]);

    const totalPages = Math.max(Math.ceil(total / parsedLimit), 1);

    res.json({
      data: courses,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPreviousPage: parsedPage > 1,
        sortBy: normalizedSortBy,
        sortOrder: sortOrder === "asc" ? "asc" : "desc",
        filters: {
          search: search || null,
          keyword: keyword || null,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    res.json(course);
  } catch (err) {
    console.error("getCourseById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a course by ID
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!course) return res.status(404).json({ message: "Course not found" });
    // if the update is
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a course by ID
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all keywords for all courses
exports.getAllKeywords = async (req, res) => {
  try {
    const result = await Course.aggregate([
      {
        $unwind: "$keywords",
      },
      {
        $group: {
          _id: null,
          allKeywords: { $addToSet: "$keywords" },
        },
      },
    ]);

    // The result is an array containing one object: [ { _id: null, allKeywords: [...] } ]
    return res.json(result.length > 0 ? result[0].allKeywords : []);
  } catch (error) {
    console.error("Error fetching keywords:", error);
    return res.status(500).json({ message: "Error fetching keywords" });
  }
};

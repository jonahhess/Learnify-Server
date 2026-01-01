const Course = require("../models/courses");

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
    //limited to 10 results
    const courses = await Course.find().limit(10);
    res.json(courses);
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

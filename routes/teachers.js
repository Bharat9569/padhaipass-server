const express  = require("express");
const Teacher  = require("../models/Teacher");
const Review   = require("../models/Review");
const { protect, teacherOnly } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");
const router   = express.Router();

// GET /api/teachers — search with pagination (public)
router.get("/", async (req, res) => {
  try {
    const { subject, city, max_fee, page = 1, limit = 10 } = req.query;
    const filter = { paid: true, blocked: false };
    if (subject && subject !== "All") filter.subjects = subject;
    if (city)    filter.city = new RegExp(city, "i");
    if (max_fee) filter.fees_min = { $lte: Number(max_fee) };

    const options = {
      page:   parseInt(page),
      limit:  parseInt(limit),
      sort:   { createdAt: -1 },
      select: "-razorpay_payment_id",
    };

    const result = await Teacher.paginate(filter, options);
    res.json({
      teachers:     result.docs,
      totalPages:   result.totalPages,
      currentPage:  result.page,
      totalResults: result.totalDocs,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teachers/me/profile — own profile
router.get("/me/profile", protect, teacherOnly, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) return res.status(404).json({ message: "Profile not found" });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teachers/me/reviews — get pending reviews for teacher to approve
router.get("/me/reviews", protect, teacherOnly, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) return res.status(404).json({ message: "Profile not found" });
    const reviews = await Review.find({ teacher: teacher._id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/teachers/me/reviews/:reviewId — approve or reject a review
router.patch("/me/reviews/:reviewId", protect, teacherOnly, async (req, res) => {
  try {
    const { status } = req.body; // "approved" or "rejected"
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const teacher = await Teacher.findOne({ user: req.user._id });
    const review  = await Review.findOne({ _id: req.params.reviewId, teacher: teacher._id });
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.status = status;
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/teachers/me/profile — update profile
router.put("/me/profile", protect, teacherOnly, async (req, res) => {
  try {
    const {
      subjects, fees_min, fees_max, experience,
      bio, city, area, phone, classes, available
    } = req.body;

    if (!subjects?.length || !fees_min || !fees_max || !experience
        || !bio || !city || !area || !phone || !classes)
      return res.status(400).json({ message: "All fields are required" });

    const teacher = await Teacher.findOneAndUpdate(
      { user: req.user._id },
      {
        subjects, fees_min: +fees_min, fees_max: +fees_max,
        experience: +experience, bio, city, area, phone, classes,
        available: available !== undefined ? available : true
      },
      { new: true, runValidators: true }
    );
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/teachers/me/photo — upload profile photo
router.post(
  "/me/photo",
  protect,
  teacherOnly,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No photo uploaded" });
      const teacher = await Teacher.findOneAndUpdate(
        { user: req.user._id },
        { photo_url: req.file.path },
        { new: true }
      );
      res.json({ photo_url: teacher.photo_url });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// POST /api/teachers/:id/view — increment profile view counter (public)
router.post("/:id/view", async (req, res) => {
  try {
    await Teacher.findByIdAndUpdate(req.params.id, { $inc: { profile_views: 1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teachers/:id — single profile (public)
router.get("/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .select("-razorpay_payment_id");
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teachers/:id/reviews — get approved reviews for public profile
router.get("/:id/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ teacher: req.params.id, status: "approved" })
      .populate("student", "name")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/teachers/:id/review — student submits a review request
router.post("/:id/review", protect, async (req, res) => {
  try {
    if (req.user.role !== "student")
      return res.status(403).json({ message: "Only students can submit reviews" });

    const { text } = req.body;
    if (!text || !text.trim())
      return res.status(400).json({ message: "Review text is required" });

    const words = text.trim().split(/\s+/).length;
    if (words > 200)
      return res.status(400).json({ message: "Review must be 200 words or less" });

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Check if already submitted
    const existing = await Review.findOne({ teacher: req.params.id, student: req.user._id });
    if (existing)
      return res.status(400).json({ message: "You have already submitted a review for this teacher" });

    const review = await Review.create({
      teacher: req.params.id,
      student: req.user._id,
      text:    text.trim(),
      status:  "pending",
    });

    res.status(201).json({ message: "Review submitted! Teacher will verify and approve it.", review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/teachers/:id/rate — rate a teacher
router.post("/:id/rate", protect, async (req, res) => {
  try {
    const { stars } = req.body;
    if (!stars || stars < 1 || stars > 5)
      return res.status(400).json({ message: "Stars must be 1–5" });
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { $push: { ratings: Number(stars) } },
      { new: true }
    );
    res.json({ rating_avg: teacher.rating_avg, count: teacher.ratings.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
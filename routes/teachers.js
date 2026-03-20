const express  = require("express");
const Teacher  = require("../models/Teacher");
const { protect, teacherOnly } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");
const router   = express.Router();

// GET /api/teachers — search (public)
router.get("/", async (req, res) => {
  try {
    const { subject, city, max_fee } = req.query;
    const filter = { paid: true, blocked: false };
    if (subject && subject !== "All") filter.subjects = subject;
    if (city)    filter.city = new RegExp(city, "i");
    if (max_fee) filter.fees_min = { $lte: Number(max_fee) };
    const teachers = await Teacher.find(filter).select("-razorpay_payment_id");
    res.json(teachers);
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
      console.error("Photo upload error:", err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

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
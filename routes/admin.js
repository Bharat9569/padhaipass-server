const express = require("express");
const Teacher = require("../models/Teacher");
const User    = require("../models/User");
const Payment = require("../models/Payment");
const { protect, adminOnly } = require("../middleware/auth");
const router  = express.Router();

// GET /api/admin/teachers
router.get("/teachers", protect, adminOnly, async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/payments  ← NEW
router.get("/payments", protect, adminOnly, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/stats
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const [totalTeachers, paidTeachers, blockedTeachers, totalStudents, unpaidTeachers] = await Promise.all([
      Teacher.countDocuments(),
      Teacher.countDocuments({ paid: true }),
      Teacher.countDocuments({ blocked: true }),
      User.countDocuments({ role: "student" }),
      Teacher.countDocuments({ paid: false }),
    ]);
    res.json({
      totalTeachers,
      paidTeachers,
      blockedTeachers,
      totalStudents,
      unpaidTeachers,
      revenue: paidTeachers * 499
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/teachers/:id/block
router.patch("/teachers/:id/block", protect, adminOnly, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: "Not found" });
    teacher.blocked = !teacher.blocked;
    await teacher.save();
    res.json({ blocked: teacher.blocked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/teachers/:id/verify-payment
router.patch("/teachers/:id/verify-payment", protect, adminOnly, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { paid: true },
      { new: true }
    );
    res.json({ paid: teacher.paid });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
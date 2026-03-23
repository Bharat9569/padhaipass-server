const express = require("express");
const Teacher = require("../models/Teacher");
const User    = require("../models/User");
const Payment = require("../models/Payment");
const Review  = require("../models/Review");
const Lead    = require("../models/Lead");
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

// GET /api/admin/payments
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
    const [
      totalTeachers,
      paidTeachers,
      blockedTeachers,
      totalStudents,
      unpaidTeachers,
      totalViews,
      pendingReviews,
      totalLeads,
      newLeads,
    ] = await Promise.all([
      Teacher.countDocuments(),
      Teacher.countDocuments({ paid: true }),
      Teacher.countDocuments({ blocked: true }),
      User.countDocuments({ role: "student" }),
      Teacher.countDocuments({ paid: false }),
      Teacher.aggregate([{ $group: { _id: null, total: { $sum: "$profile_views" } } }]),
      Review.countDocuments({ status: "pending" }),
      Lead.countDocuments(),
      Lead.countDocuments({ status: "new" }),
    ]);

    res.json({
      totalTeachers,
      paidTeachers,
      blockedTeachers,
      totalStudents,
      unpaidTeachers,
      revenue: paidTeachers * 499,
      totalProfileViews: totalViews[0]?.total || 0,
      pendingReviews,
      totalLeads,
      newLeads,
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

// GET /api/admin/leads
router.get("/leads", protect, adminOnly, async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/leads/:id/status
router.patch("/leads/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
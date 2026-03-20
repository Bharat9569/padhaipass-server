const express = require("express");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const Teacher = require("../models/Teacher");
const { protect } = require("../middleware/auth");
const router  = express.Router();

const signToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, adminCode } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ message: "All fields required" });

    // ── ADMIN SECURITY CHECKS ──────────────────────────────
    if (role === "admin") {
      // Check 1: Secret code must match
      if (adminCode !== process.env.ADMIN_SECRET_CODE)
        return res.status(403).json({ message: "Invalid admin secret code" });

      // Check 2: Only one admin allowed
      const existingAdmin = await User.findOne({ role: "admin" });
      if (existingAdmin)
        return res.status(403).json({ message: "An admin account already exists. Contact existing admin." });

      // Check 3: Email must match the whitelisted admin email
      if (email !== process.env.ADMIN_EMAIL)
        return res.status(403).json({ message: "This email is not authorized for admin access" });
    }
    // ──────────────────────────────────────────────────────

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already registered" });

    const user = await User.create({ name, email, password, role });

    if (role === "teacher") {
      await Teacher.create({
        user: user._id, name, email,
        subjects: [], fees_min: 0, fees_max: 0,
        experience: 0, bio: "", city: "", area: "",
        phone: "", classes: "", available: true, paid: false,
      });
    }

    res.status(201).json({
      token: signToken(user._id),
      user: { id: user._id, name, email, role }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    res.json({
      token: signToken(user._id),
      user: { id: user._id, name: user.name, email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get("/me", protect, (req, res) => {
  res.json({ id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role });
});

module.exports = router;
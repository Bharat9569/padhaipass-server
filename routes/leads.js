const express    = require("express");
const nodemailer = require("nodemailer");
const Lead       = require("../models/Lead");
const router     = express.Router();

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// POST /api/leads — student submits lead
router.post("/", async (req, res) => {
  try {
    const { name, phone, class: cls, subjects, city, locality } = req.body;

    if (!name?.trim() || !phone?.trim())
      return res.status(400).json({ message: "Name and phone are required" });

    // Save lead to MongoDB
    const lead = await Lead.create({
      name:     name.trim(),
      phone:    phone.trim(),
      class:    cls    || "",
      subjects: subjects || [],
      city:     city    || "",
      locality: locality || "",
    });

    // Prepare email content
    const subjectLine  = subjects?.length > 0 ? subjects.join(", ") : "Not specified";
    const classLine    = cls      || "Not specified";
    const cityLine     = city     || "Not specified";
    const localityLine = locality || "Not specified";

    // Send email notification
    await transporter.sendMail({
      from:    process.env.GMAIL_USER,
      to:      process.env.NOTIFY_EMAIL,
      subject: `🔔 New Student Lead — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:500px; margin:0 auto; background:#f9f9f9; padding:24px; border-radius:12px;">
          <h2 style="color:#f97316; margin-bottom:4px;">New Student Lead!</h2>
          <p style="color:#64748b; margin-top:0;">A student couldn't find a tutor on PadhaiPass</p>
          <hr style="border:1px solid #e2e8f0; margin:16px 0;">
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0; color:#64748b; font-size:14px; width:40%;">👤 Name</td>
              <td style="padding:8px 0; font-weight:600; font-size:14px;">${name}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:8px 0; color:#64748b; font-size:14px;">📞 Phone</td>
              <td style="padding:8px 0; font-weight:600; font-size:14px;">${phone}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#64748b; font-size:14px;">📚 Class</td>
              <td style="padding:8px 0; font-weight:600; font-size:14px;">${classLine}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:8px 0; color:#64748b; font-size:14px;">📖 Subjects</td>
              <td style="padding:8px 0; font-weight:600; font-size:14px;">${subjectLine}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#64748b; font-size:14px;">📍 City</td>
              <td style="padding:8px 0; font-weight:600; font-size:14px;">${cityLine}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:8px 0; color:#64748b; font-size:14px;">🏘️ Locality</td>
              <td style="padding:8px 0; font-weight:600; font-size:14px;">${localityLine}</td>
            </tr>
          </table>
          <hr style="border:1px solid #e2e8f0; margin:16px 0;">
          <a href="https://padhaipass.com/admin" style="background:#f97316; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
            View in Admin Panel →
          </a>
        </div>
      `,
    });

    res.status(201).json({ message: "Thank you! We will find a tutor for you soon." });
  } catch (err) {
    console.error("Lead error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
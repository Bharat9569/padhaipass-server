const express  = require("express");
const crypto   = require("crypto");
const Razorpay = require("razorpay");
const Payment  = require("../models/Payment");
const Teacher  = require("../models/Teacher");
const { protect, teacherOnly } = require("../middleware/auth");
const router   = express.Router();

const rzp = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
// Only creates a Razorpay order — does NOT save to DB yet
// DB record is only created after successful verification
router.post("/create-order", protect, teacherOnly, async (req, res) => {
  try {
    const order = await rzp.orders.create({
      amount:   49900,
      currency: "INR",
      receipt:  "r_" + Date.now(),
    });
    // Send order details to frontend — no DB write here
    res.json({
      orderId:  order.id,
      amount:   order.amount,
    });
  } catch (err) {
    console.error("❌ create-order error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payments/verify
// Called ONLY when Razorpay confirms payment success
// THIS is where we save to DB and activate the teacher
router.post("/verify", protect, teacherOnly, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ message: "Missing payment fields" });

    // ── VERIFY SIGNATURE (proves payment is real) ──────────
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expected !== razorpay_signature)
      return res.status(400).json({ message: "Invalid payment — signature mismatch" });

    // ── PAYMENT IS REAL — now save to DB ───────────────────
    // Check if already processed (prevent duplicate)
    const existing = await Payment.findOne({ razorpay_payment_id });
    if (existing)
      return res.status(400).json({ message: "Payment already processed" });

    // Save successful payment record
    await Payment.create({
      user:                req.user._id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount:              49900,
      status:              "success",
    });

    // Activate teacher profile
    const teacher = await Teacher.findOneAndUpdate(
      { user: req.user._id },
      { paid: true, razorpay_payment_id },
      { new: true }
    );

    console.log("✅ Payment verified and teacher activated:", teacher?.name);
    res.json({ verified: true, teacher });

  } catch (err) {
    console.error("❌ verify error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
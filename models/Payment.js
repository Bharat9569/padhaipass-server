const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  user:                  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacher:               { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  razorpay_order_id:     { type: String, required: true },
  razorpay_payment_id:   { type: String, default: "" },
  razorpay_signature:    { type: String, default: "" },
  amount:                { type: Number, default: 49900 },
  status:                { type: String, enum: ["pending","success","failed"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Payment", PaymentSchema);
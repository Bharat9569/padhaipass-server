const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  teacher:  { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  student:  { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  text:     { type: String, required: true, maxlength: 1000 },
  status:   { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: true });

// One review per student per teacher
ReviewSchema.index({ teacher: true, student: true }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema);
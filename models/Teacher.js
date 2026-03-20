const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  name:       { type: String, required: true },
  email:      { type: String, required: true },
  phone:      { type: String, default: "" },
  subjects:   { type: [String], default: [] },
  fees_min:   { type: Number, default: 0 },
  fees_max:   { type: Number, default: 0 },
  experience: { type: Number, default: 0 },
  bio:        { type: String, default: "" },
  city:       { type: String, default: "" },
  area:       { type: String, default: "" },
  classes:    { type: String, default: "" },
  photo_url:  { type: String, default: "" },
  available:  { type: Boolean, default: true },
  paid:       { type: Boolean, default: false },
  blocked:    { type: Boolean, default: false },
  ratings:    { type: [Number], default: [] },
  razorpay_payment_id: { type: String, default: "" },
}, { timestamps: true });

TeacherSchema.virtual("rating_avg").get(function() {
  if (!this.ratings.length) return 0;
  return +(this.ratings.reduce((a,b)=>a+b,0)/this.ratings.length).toFixed(1);
});

TeacherSchema.set("toJSON", { virtuals: true });
module.exports = mongoose.model("Teacher", TeacherSchema);
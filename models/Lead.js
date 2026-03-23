const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, required: true, trim: true },
  class:    { type: String, default: "" },
  subjects: { type: [String], default: [] },
  city:     { type: String, default: "" },
  locality: { type: String, default: "" },
  status:   { type: String, enum: ["new", "contacted", "converted"], default: "new" },
}, { timestamps: true });

module.exports = mongoose.model("Lead", LeadSchema);
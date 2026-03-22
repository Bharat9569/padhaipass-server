// Run once to clean up all pending/cancelled payment records
// Command: node scripts/cleanPending.js

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Payment  = require("../models/Payment");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await Payment.deleteMany({ status: "pending" });
 
  process.exit(0);
}).catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
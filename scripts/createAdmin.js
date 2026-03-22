// Run once: node server/scripts/createAdmin.js
require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User     = require("../models/User");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const exists = await User.findOne({ email: "admin@padhaipass.com" });
  if (exists) { console.log("Admin already exists"); process.exit(0); }
  await User.create({ name:"Admin", email:"admin@padhaipass.com", password:"admin@123", role:"admin" });
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
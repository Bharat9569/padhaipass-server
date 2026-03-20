const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth",     require("./routes/auth"));
app.use("/api/teachers", require("./routes/teachers"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/admin",    require("./routes/admin"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT, () =>
      console.log(`✅ Server running on port http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => { console.error("❌ MongoDB error:", err.message); process.exit(1); });
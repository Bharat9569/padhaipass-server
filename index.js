const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
require("dotenv").config();

const app = express();

// ── Security headers ──────────────────────────────────────
app.use(helmet());

// ── CORS — only allow your domain ────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "https://padhaipass.in",
  "https://www.padhaipass.in",
  "https://padhaipass-client-v1.vercel.app",  // add your vercel URL
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

// ── Rate limiting — prevent spam/attacks ─────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max 100 requests per IP
  message: { message: "Too many requests, please try again later." }
});
app.use("/api/", limiter);

// Stricter limit on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // max 10 login/register attempts per 15 min
  message: { message: "Too many attempts, please try again later." }
});
app.use("/api/auth/", authLimiter);

// ── Routes ────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/teachers", require("./routes/teachers"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/admin",    require("./routes/admin"));

// ── Health check ──────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "PadhaiPass API running" }));

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

// ── MongoDB + Start server ────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server running on port " + (process.env.PORT || 5000))
    );
  })
  .catch(err => { console.error("MongoDB error:", err.message); process.exit(1); });



  
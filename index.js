const express        = require("express");
const mongoose       = require("mongoose");
const cors           = require("cors");
const helmet         = require("helmet");
const rateLimit      = require("express-rate-limit");
const mongoSanitize  = require("express-mongo-sanitize");
const xss            = require("xss-clean");
const hpp            = require("hpp");
require("dotenv").config();

const app = express();

// ── Security headers ──────────────────────────────────────
app.use(helmet());

// ── CORS — only allow your domain ────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "https://padhaipass.in",
  "https://www.padhaipass.in",
  "https://padhaipass-client-v1.vercel.app",
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

// ── Sanitization ──────────────────────────────────────────
app.use(mongoSanitize());  // blocks MongoDB injection ($where, $gt etc.)
app.use(xss());            // strips <script> tags from req.body & req.query
app.use(hpp());            // prevents duplicate query param attacks

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." }
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`🚀 HTTPS Server running at: http://localhost:${PORT}`)
    );
  })
  .catch(err => { console.error("MongoDB error:", err.message); process.exit(1); });



  
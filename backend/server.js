require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Behind a reverse proxy (Render/Vercel/Nginx) so rate limiting and secure
// cookies see the real client IP. Enabled only in production.
if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

const STATIC_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://m2n-hotel.vercel.app",
];

const allowedOrigins = new Set(STATIC_ALLOWED_ORIGINS);
if (process.env.FRONTEND_URL) {
  allowedOrigins.add(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin/non-browser requests (curl, health checks) which send no Origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Authorization"],
  credentials: true,
  maxAge: 86400,
};

// Secure HTTP headers. crossOriginResourcePolicy relaxed so the frontend on a
// different origin can still consume JSON responses.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(corsOptions));

// Body parsing with sane size limits (basic request-size hardening).
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// General API rate limit — generous enough for normal browsing, blocks abuse.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Stricter limit for write endpoints (e.g. booking inquiries) to prevent spam.
// Overridable so integration runs can exercise the write paths in bulk; the
// default is what production uses.
const WRITE_RATE_LIMIT_MAX = Number(process.env.WRITE_RATE_LIMIT_MAX) || 20;
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: WRITE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many submissions. Please wait a while before trying again.",
  },
});

// Guest booking lookups are guessable by reference, so they get a tighter
// budget than general browsing to make enumeration impractical.
const bookingLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.BOOKING_LOOKUP_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many booking lookups. Please try again later.",
  },
});

app.use("/api", generalLimiter);
app.use("/api/inquiries", (req, res, next) => {
  if (req.method === "POST") return writeLimiter(req, res, next);
  return next();
});
app.use("/api/bookings", (req, res, next) => {
  if (req.method === "POST") return writeLimiter(req, res, next);
  if (req.method === "GET") return bookingLookupLimiter(req, res, next);
  return next();
});

// Stricter limit for admin login to reduce brute-force attempts.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please wait a while before trying again.",
  },
});
app.use("/api/admin/auth/login", adminLoginLimiter);

// Serve uploaded hotel media (admin uploads). Public GETs for hotels still
// return URLs; this makes relative /uploads/... paths resolvable.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: IS_PRODUCTION ? "7d" : 0,
    fallthrough: true,
  })
);

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`M2N Hotel server running on http://localhost:${PORT}`);
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();
const PORT = Number(process.env.PORT) || 5001;

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
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`M2N Hotel server running on http://localhost:${PORT}`);
});

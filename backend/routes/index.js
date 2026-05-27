const express = require("express");
const indexRoutes = require("./index.routes");
const hotelRoutes = require("./hotel.routes");
const roomRoutes = require("./room.routes");
const inquiryRoutes = require("./inquiry.routes");

const router = express.Router();

router.use("/", indexRoutes);
router.use("/api/hotels", hotelRoutes);
router.use("/api/rooms", roomRoutes);
router.use("/api/inquiries", inquiryRoutes);

module.exports = router;

const express = require("express");
const indexRoutes = require("./index.routes");
const hotelRoutes = require("./hotel.routes");
const roomRoutes = require("./room.routes");
const inquiryRoutes = require("./inquiry.routes");
const adminAuthRoutes = require("./adminAuth.routes");
const adminHotelRoutes = require("./adminHotel.routes");
const adminRoomTypeRoutes = require("./adminRoomType.routes");
const adminRoomRoutes = require("./adminRoom.routes");
const adminMediaRoutes = require("./adminMedia.routes");
const tariffRoutes = require("./tariff.routes");
const adminTariffRoutes = require("./adminTariff.routes");
const bookingRoutes = require("./booking.routes");
const adminBookingRoutes = require("./adminBooking.routes");

const router = express.Router();

router.use("/", indexRoutes);
router.use("/api/hotels", hotelRoutes);
router.use("/api/rooms", roomRoutes);
router.use("/api/inquiries", inquiryRoutes);
router.use("/api/tariffs", tariffRoutes);
router.use("/api/bookings", bookingRoutes);
router.use("/api/admin/auth", adminAuthRoutes);
router.use("/api/admin/hotels", adminHotelRoutes);
router.use("/api/admin/room-types", adminRoomTypeRoutes);
router.use("/api/admin/rooms", adminRoomRoutes);
router.use("/api/admin/media", adminMediaRoutes);
router.use("/api/admin/tariffs", adminTariffRoutes);
router.use("/api/admin/bookings", adminBookingRoutes);

module.exports = router;

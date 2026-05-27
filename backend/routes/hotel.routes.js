const express = require("express");
const hotelController = require("../controllers/hotel.controller");

const router = express.Router();

router.get("/", hotelController.listHotels);
router.get("/:slug", hotelController.getHotelBySlug);

module.exports = router;

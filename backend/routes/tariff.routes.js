const express = require("express");
const tariffController = require("../controllers/tariff.controller");

const router = express.Router();

router.get("/", tariffController.getTariffsByHotelSlug);

module.exports = router;

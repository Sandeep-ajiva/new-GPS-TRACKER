const express = require("express");
const router = express.Router();
const controller = require("./controller");

// Ingest AIS-140 packet / JSON
router.post("/ingest", controller.ingestData);

// Fetch live data
router.get("/", controller.getLiveData);
router.get("/vehicle/:vehicleId", controller.getByVehicle);
router.get("/device/:gpsDeviceId", controller.getByDevice);
router.get("/imei/:imei", controller.getByImei);

module.exports = router;

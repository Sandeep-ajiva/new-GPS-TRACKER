const express = require("express");
const router = express.Router();
const controller = require("./controller");

router.get(
  "/",
  controller.getLiveData,
);  
router.get(
  "/vehicle/:vehicleId",
  controller.getLiveDataByVehicle,
);  

// const GpsLiveDataController = require("./controller");

// router.post("/ingest", GpsLiveDataController.ingestData);

module.exports = router;

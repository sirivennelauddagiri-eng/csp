const express = require("express");
const router = express.Router();
const shipmentController = require("../controllers/shipmentController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/create",                          shipmentController.createShipment);
router.get("/my",                               shipmentController.getMyShipments);
router.get("/track/:trackingNumber",            shipmentController.trackShipment);
router.get("/:id",                              shipmentController.getShipment);

module.exports = router;

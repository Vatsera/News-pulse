const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { triggerIngest, getIngestStatus } = require("../controllers/ingest.controller");

const router = express.Router();

router.post("/trigger", asyncHandler(triggerIngest));
router.get("/status/:jobId", asyncHandler(getIngestStatus));

module.exports = router;

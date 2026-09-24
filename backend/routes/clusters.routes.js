const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { getClusters, getClusterDetail } = require("../controllers/clusters.controller");

const router = express.Router();

router.get("/", asyncHandler(getClusters));
router.get("/:id", asyncHandler(getClusterDetail));

module.exports = router;

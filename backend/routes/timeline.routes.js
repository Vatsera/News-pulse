const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { getTimeline } = require("../controllers/timeline.controller");

const router = express.Router();

router.get("/", asyncHandler(getTimeline));

module.exports = router;

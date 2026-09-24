/**
 * controllers/timeline.controller.js
 * Responsibility: serve the /timeline endpoint. Thin on purpose -- all the
 * real logic (shaping clusters + articles for a time axis) lives in
 * services/cluster.service.js.
 */

const { getDb } = require("../config/db");
const clusterService = require("../services/cluster.service");

async function getTimeline(req, res) {
  const timeline = await clusterService.getTimeline(getDb());
  res.json({ count: timeline.length, timeline });
}

module.exports = { getTimeline };

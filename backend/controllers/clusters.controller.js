/**
 * controllers/clusters.controller.js
 * Responsibility: translate HTTP requests into service calls, and service
 * results into HTTP responses. No MongoDB code lives here.
 */

const { getDb } = require("../config/db");
const clusterService = require("../services/cluster.service");
const { toObjectId } = require("../utils/objectId");
const ApiError = require("../utils/ApiError");

async function getClusters(req, res) {
  const clusters = await clusterService.listClusters(getDb());
  res.json({ count: clusters.length, clusters });
}

async function getClusterDetail(req, res) {
  const clusterObjectId = toObjectId(req.params.id);
  if (!clusterObjectId) {
    throw new ApiError(400, `Invalid cluster id: ${req.params.id}`);
  }

  const cluster = await clusterService.getClusterById(getDb(), clusterObjectId);
  if (!cluster) {
    throw new ApiError(404, `No cluster found with id ${req.params.id}`);
  }

  res.json(cluster);
}

module.exports = { getClusters, getClusterDetail };

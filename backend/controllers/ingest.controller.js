/**
 * controllers/ingest.controller.js
 * Responsibility: HTTP glue for triggering ingestion and polling its status.
 */

const ingestService = require("../services/ingest.service");
const ApiError = require("../utils/ApiError");

async function triggerIngest(req, res) {
  const job = ingestService.triggerIngestion();

  // 202 Accepted: "request understood, work is happening in the
  // background" -- more accurate than 200 for a job that isn't done yet.
  res.status(202).json({
    jobId: job.jobId,
    status: job.status,
  });
}

async function getIngestStatus(req, res) {
  const job = ingestService.getJobStatus(req.params.jobId);
  if (!job) {
    throw new ApiError(404, `No ingestion job found with id ${req.params.jobId}`);
  }

  res.json(job);
}

module.exports = { triggerIngest, getIngestStatus };

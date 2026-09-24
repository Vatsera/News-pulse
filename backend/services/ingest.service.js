/**
 * services/ingest.service.js
 * Responsibility: start the Python scraper as a child process and keep
 * track of its status. This is the Node <-> Python integration point.
 *
 * Why child_process.spawn instead of something fancier (a job queue like
 * BullMQ, a separate microservice, etc.)? For this project's scale --
 * one on-demand ingestion job at a time -- spawning the Python process
 * directly is the simplest thing that actually works, and it's exactly
 * the integration the assessment describes ("triggers your Python
 * pipeline as a subprocess"). The tradeoffs, being upfront about them:
 *   - Node and Python must run on the same machine/container. This
 *     breaks if the backend is deployed somewhere without a Python
 *     runtime (e.g. a Node-only host) -- in that case you'd trigger a
 *     separately hosted job (GitHub Actions, a Render cron job) instead,
 *     which is one of the alternatives the assessment itself lists.
 *   - Job status lives in memory (a plain Map), so it's lost if the
 *     server restarts mid-job. Fine for a take-home; a real production
 *     system would persist job status in the database instead.
 *   - Only one ingestion job is allowed to run at a time (guarded below)
 *     to avoid two scraper processes hammering the same feeds/DB at once.
 */

const { spawn } = require("child_process");
const path = require("path");
const crypto = require("crypto");

const PYTHON_PATH = process.env.PYTHON_PATH || "python";
const PYTHON_SCRIPT = process.env.PYTHON_SCRIPT;

// jobId -> { jobId, status, startedAt, completedAt, error, logs }
const jobs = new Map();
let activeJobId = null;

const MAX_LOG_LINES = 20;

function appendLog(job, chunk) {
  const lines = chunk.toString().split("\n").filter(Boolean);
  job.logs.push(...lines);
  if (job.logs.length > MAX_LOG_LINES) {
    job.logs = job.logs.slice(-MAX_LOG_LINES);
  }
}

function triggerIngestion() {
  // Don't start a second scraper run while one is already in progress --
  // just hand back the job that's already running.
  if (activeJobId && jobs.get(activeJobId)?.status === "running") {
    return jobs.get(activeJobId);
  }

  if (!PYTHON_SCRIPT) {
    throw new Error("PYTHON_SCRIPT is not configured (check your .env)");
  }

  const jobId = crypto.randomUUID();
  const job = {
    jobId,
    status: "queued",
    startedAt: null,
    completedAt: null,
    error: null,
    logs: [],
  };
  jobs.set(jobId, job);
  activeJobId = jobId;

  // Run the scraper from its own folder so its relative imports
  // (feeds, cleaner, etc.) and its .env file resolve exactly like they
  // do when you run `python main.py` by hand from scraper/.
  const scraperDir = path.dirname(PYTHON_SCRIPT);

  let child;
  try {
    // -u: unbuffered stdout, so `logs` reflects progress in near real time
    // instead of only appearing once Python's output buffer flushes.
    child = spawn(PYTHON_PATH, ["-u", PYTHON_SCRIPT], { cwd: scraperDir });
  } catch (err) {
    job.status = "failed";
    job.error = err.message;
    job.completedAt = new Date();
    activeJobId = null;
    return job;
  }

  job.status = "running";
  job.startedAt = new Date();

  child.stdout.on("data", (chunk) => appendLog(job, chunk));
  child.stderr.on("data", (chunk) => appendLog(job, chunk));

  child.on("error", (err) => {
    // e.g. PYTHON_PATH doesn't exist (ENOENT) -- the process never started
    job.status = "failed";
    job.error = err.message;
    job.completedAt = new Date();
    activeJobId = null;
  });

  child.on("close", (exitCode) => {
    if (exitCode === 0) {
      job.status = "completed";
    } else {
      job.status = "failed";
      job.error = `Scraper exited with code ${exitCode}`;
    }
    job.completedAt = new Date();
    activeJobId = null;
  });

  return job;
}

function getJobStatus(jobId) {
  return jobs.get(jobId) || null;
}

module.exports = { triggerIngestion, getJobStatus };

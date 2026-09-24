/**
 * server.js
 * Entry point. Wires everything together: loads config, connects to
 * MongoDB, sets up Express (middleware + routes), and starts listening.
 * Run this file directly (`node server.js` / `npm start`) -- nothing
 * else in the backend is meant to be run standalone.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectToDatabase } = require("./config/db");
const clustersRoutes = require("./routes/clusters.routes");
const timelineRoutes = require("./routes/timeline.routes");
const ingestRoutes = require("./routes/ingest.routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const PORT = process.env.PORT || 5000;

// FRONTEND_URL is sanitized rather than used as-is: hosting dashboard text
// fields (Render's included) can silently inject stray whitespace or other
// non-printable characters when a value is typed/pasted in, which crashes
// the cors middleware with ERR_INVALID_CHAR when it tries to set the
// Access-Control-Allow-Origin header. Stripping non-printable characters
// and adding the scheme in code (rather than requiring "https://" to be
// typed into that field correctly) avoids that whole class of paste bugs.
function resolveFrontendUrl() {
  const raw = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/[^\x20-\x7E]/g, "").trim();
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

const FRONTEND_URL = resolveFrontendUrl();

async function main() {
  await connectToDatabase();

  const app = express();

  app.use(cors({ origin: FRONTEND_URL }));
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({ service: "News Pulse API", status: "ok" });
  });

  app.use("/clusters", clustersRoutes);
  app.use("/timeline", timelineRoutes);
  app.use("/ingest", ingestRoutes);

  app.use(notFound);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`[server] News Pulse API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});

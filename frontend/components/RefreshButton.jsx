/**
 * components/RefreshButton.jsx
 * Triggers a real ingestion run and reflects its actual progress -- no
 * fake progress bar. Flow: POST /ingest/trigger -> poll GET
 * /ingest/status/:jobId every few seconds -> on "completed", fetch the
 * fresh timeline and hand it to the parent; on "failed", show why.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { triggerIngest, getIngestStatus, getTimeline } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const STATUS_MESSAGES = {
  queued: "Queued…",
  running: "Fetching the latest articles…",
};

export default function RefreshButton({ onSuccess }) {
  const [phase, setPhase] = useState("idle"); // idle | working | failed
  const [message, setMessage] = useState("");
  const timeoutRef = useRef(null);

  // Don't let a pending poll fire after the component unmounts.
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function pollStatus(jobId, startedAt) {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      setPhase("failed");
      setMessage("Ingestion is taking longer than expected. Please try again shortly.");
      return;
    }

    let job;
    try {
      job = await getIngestStatus(jobId);
    } catch (err) {
      setPhase("failed");
      setMessage(err.message);
      return;
    }

    if (job.status === "completed") {
      setMessage("Loading updated timeline…");
      try {
        const fresh = await getTimeline();
        onSuccess(fresh.timeline);
        setPhase("idle");
        setMessage("");
      } catch (err) {
        setPhase("failed");
        setMessage(err.message);
      }
      return;
    }

    if (job.status === "failed") {
      setPhase("failed");
      setMessage(job.error || "Ingestion failed.");
      return;
    }

    setMessage(STATUS_MESSAGES[job.status] || "Working…");
    timeoutRef.current = setTimeout(() => pollStatus(jobId, startedAt), POLL_INTERVAL_MS);
  }

  async function handleClick() {
    if (phase === "working") return; // guard against double-triggering

    setPhase("working");
    setMessage("Starting ingestion…");

    try {
      const job = await triggerIngest();
      pollStatus(job.jobId, Date.now());
    } catch (err) {
      setPhase("failed");
      setMessage(err.message);
    }
  }

  const isWorking = phase === "working";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isWorking}
        className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isWorking && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {isWorking ? "Refreshing…" : "Refresh Data"}
      </button>
      {message && (
        <p
          className={`max-w-xs text-right text-xs ${
            phase === "failed" ? "text-critical" : "text-ink-secondary"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

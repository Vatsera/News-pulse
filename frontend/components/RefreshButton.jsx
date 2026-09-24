/**
 * components/RefreshButton.jsx
 * Re-fetches the current timeline from the database. Articles themselves
 * arrive on their own schedule (see .github/workflows/scrape.yml, which
 * runs the scraper hourly) -- this button doesn't start a new scrape, it
 * just shows whatever the database holds right now, since a hosted
 * backend can't spawn the Python scraper as a subprocess the way a local
 * one can.
 */

"use client";

import { useState } from "react";
import { getTimeline, FRIENDLY_ERROR_MESSAGE } from "@/lib/api";

export default function RefreshButton({ onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const fresh = await getTimeline();
      onSuccess(fresh.timeline);
    } catch {
      setError(FRIENDLY_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {isLoading ? "Refreshing…" : "Refresh Data"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-critical">{error}</p>}
    </div>
  );
}

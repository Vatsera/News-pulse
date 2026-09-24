/**
 * lib/api.js
 * The only file that knows the backend's URL/shape. Every component talks
 * to the API through these three functions instead of calling fetch()
 * directly -- so the base URL and error handling live in one place.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    // fetch() itself throws for network failures (backend down, DNS, etc)
    // -- this is the "backend unavailable" case.
    throw new Error(
      "Could not reach the News Pulse API. Make sure the backend is running."
    );
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // response wasn't JSON -- fall through, body stays null
  }

  if (!response.ok) {
    throw new Error(body?.error?.message || `Request failed (${response.status})`);
  }

  return body;
}

/** GET /timeline -- clusters + their articles, chronologically ordered. */
export function getTimeline() {
  return request("/timeline", { cache: "no-store" });
}

/** POST /ingest/trigger -- starts the Python scraper, returns { jobId, status }. */
export function triggerIngest() {
  return request("/ingest/trigger", { method: "POST" });
}

/** GET /ingest/status/:jobId -- current status of a previously triggered job. */
export function getIngestStatus(jobId) {
  return request(`/ingest/status/${encodeURIComponent(jobId)}`, { cache: "no-store" });
}

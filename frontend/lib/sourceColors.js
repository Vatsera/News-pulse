/**
 * lib/sourceColors.js
 * Assigns each news source a consistent color, in the order sources first
 * appear in the *unfiltered* data. This matters: if colors were reassigned
 * every time the source filter changes, a source's color would shift as
 * others got toggled off -- confusing. Assign once, from the full list,
 * and never repaint.
 */

const PALETTE = [
  { text: "text-source-1", dot: "bg-source-1" },
  { text: "text-source-2", dot: "bg-source-2" },
  { text: "text-source-3", dot: "bg-source-3" },
];

const FALLBACK = { text: "text-ink-secondary", dot: "bg-muted" };

/** sources: array of unique source name strings, in a stable order. */
export function buildSourceColorMap(sources) {
  const map = {};
  sources.forEach((source, index) => {
    map[source] = PALETTE[index] || FALLBACK;
  });
  return map;
}

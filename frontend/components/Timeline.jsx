/**
 * components/Timeline.jsx
 * The core visual: one row per topic cluster, each showing a marker that
 * spans from its earliest to latest article along a shared time axis --
 * a swimlane / Gantt-style timeline, built with plain divs (no charting
 * library needed for this shape).
 *
 * Deliberate color choice: every bar uses the same single accent color.
 * These bars aren't different *categories* the way news sources are --
 * they're all "a topic was active here," so one consistent color reads
 * as one series. Only the selected row gets visual emphasis (a filled
 * vs. lighter bar, a highlighted row background) instead of a new hue.
 */

"use client";

import { useMemo } from "react";
import EmptyState from "@/components/EmptyState";
import { formatRange } from "@/lib/formatTime";

const LABEL_COLUMN_WIDTH = "14rem";
const TICK_COUNT = 6;
const ONE_HOUR = 1000 * 60 * 60;

function clampPercent(value) {
  return Math.min(Math.max(value, 0), 100);
}

function percentile(sortedValues, p) {
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function computeDomain(clusters) {
  const timestamps = [];
  for (const cluster of clusters) {
    timestamps.push(new Date(cluster.startTime).getTime());
    timestamps.push(new Date(cluster.endTime).getTime());
  }
  timestamps.sort((a, b) => a - b);

  // Outlier-resistant on purpose: a single stale RSS entry (e.g. BBC's
  // persistent "live updates" page, whose feed pubDate can be over a
  // year old) would otherwise stretch the whole axis into unreadable
  // multi-year ticks and squash every real cluster into one pixel.
  // Trim to the 5th-95th percentile; rows outside that window still
  // render, clamped to the nearest edge (see TimelineRow), with their
  // real timestamp always available in the hover tooltip.
  let min = percentile(timestamps, 0.05);
  let max = percentile(timestamps, 0.95);

  if (min === max) {
    // Everything happened at one instant -- open up a visible window.
    min -= 30 * 60 * 1000;
    max += 30 * 60 * 1000;
  }

  const padding = (max - min) * 0.03;
  return { min: min - padding, max: max + padding };
}

function buildTicks(domain) {
  const span = domain.max - domain.min;
  const formatter =
    span > 36 * ONE_HOUR
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
      : new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

  return Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
    const timestamp = domain.min + (span * i) / TICK_COUNT;
    return { position: (i / TICK_COUNT) * 100, label: formatter.format(new Date(timestamp)) };
  });
}

function TimelineAxis({ ticks }) {
  return (
    <div className="flex border-b border-gridline bg-page/60">
      <div
        style={{ width: LABEL_COLUMN_WIDTH }}
        className="shrink-0 border-r border-gridline px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted"
      >
        Topic
      </div>
      <div className="relative h-9 flex-1">
        {ticks.map((tick, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-gridline/60"
            style={{ left: `${tick.position}%` }}
          />
        ))}
        {ticks.map((tick, i) => (
          <span
            key={i}
            className="absolute top-2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-muted"
            style={{ left: `${tick.position}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelineRow({ cluster, domain, ticks, isSelected, onSelect }) {
  const span = domain.max - domain.min;
  const startMs = new Date(cluster.startTime).getTime();
  const endMs = new Date(cluster.endTime).getTime();

  // Clamp each edge independently into [0, 100]. A cluster entirely
  // outside the trimmed domain (see computeDomain) still shows -- pinned
  // to whichever edge it's closest to -- instead of vanishing off-canvas.
  const left = clampPercent(((startMs - domain.min) / span) * 100);
  const right = clampPercent(((endMs - domain.min) / span) * 100);
  const rawWidth = right - left;
  const isPoint = rawWidth < 0.6;
  const width = Math.max(rawWidth, 0.6);

  // Bigger cluster = slightly taller marker, capped so it never dominates the row.
  const barHeight = Math.min(8 + Math.min(cluster.articleCount - 1, 6) * 2, 22);

  const ariaLabel = `${cluster.label} — ${cluster.articleCount} article${
    cluster.articleCount === 1 ? "" : "s"
  } — ${formatRange(cluster.startTime, cluster.endTime)}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      className={`group relative flex w-full items-center border-l-[3px] text-left transition-colors ${
        isSelected
          ? "border-accent-strong bg-accent/5"
          : "border-transparent hover:bg-page"
      }`}
    >
      <div
        style={{ width: LABEL_COLUMN_WIDTH }}
        className="shrink-0 border-r border-gridline px-4 py-3"
      >
        <p
          className={`truncate text-sm font-medium ${isSelected ? "text-accent-strong" : "text-ink"}`}
          title={cluster.label}
        >
          {cluster.label}
        </p>
        <p className="text-xs text-muted">
          {cluster.articleCount} article{cluster.articleCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="relative h-12 flex-1 px-1">
        {/* Gridlines, aligned to the shared axis ticks -- recessive hairlines
            behind the mark so rows stay readable against the time axis. */}
        {ticks.map((tick, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-gridline/60"
            style={{ left: `${tick.position}%` }}
          />
        ))}

        {isPoint ? (
          <span
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-colors ${
              isSelected ? "bg-accent-strong" : "bg-accent"
            }`}
            style={{ left: `${left}%`, width: 10, height: 10 }}
          />
        ) : (
          <span
            className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-colors ${
              isSelected ? "bg-accent-strong" : "bg-accent/80 group-hover:bg-accent-strong"
            }`}
            style={{ left: `${left}%`, width: `${width}%`, height: barHeight }}
          />
        )}

        {/* Hover/focus tooltip -- CSS-only, anchored to the mark. Enhances
            only: the same count/range is already in the label column and,
            once selected, the detail panel. */}
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ left: `${(left + right) / 2}%` }}
        >
          <p className="font-semibold text-white">
            {cluster.articleCount} article{cluster.articleCount === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 text-white/70">{formatRange(cluster.startTime, cluster.endTime)}</p>
        </div>
      </div>
    </button>
  );
}

export default function Timeline({ clusters, selectedClusterId, onSelectCluster }) {
  const domain = useMemo(() => (clusters.length ? computeDomain(clusters) : null), [clusters]);
  const ticks = useMemo(() => (domain ? buildTicks(domain) : []), [domain]);

  if (clusters.length === 0) {
    return (
      <EmptyState
        title="No clusters match the selected sources"
        message="Try including more sources in the filter above."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gridline bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-gridline px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Timeline</h2>
        <p className="text-xs text-muted">
          {clusters.length} topic{clusters.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <TimelineAxis ticks={ticks} />
          <div className="max-h-[560px] divide-y divide-gridline overflow-y-auto">
            {clusters.map((cluster) => (
              <TimelineRow
                key={cluster.clusterId}
                cluster={cluster}
                domain={domain}
                ticks={ticks}
                isSelected={cluster.clusterId === selectedClusterId}
                onSelect={() => onSelectCluster(cluster.clusterId)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

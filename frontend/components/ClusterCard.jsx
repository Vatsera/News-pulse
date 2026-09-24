/**
 * components/ClusterCard.jsx
 * The header summary for whichever cluster is currently selected: its
 * label, how many articles are in it, and the time window it spans.
 */

import { formatRange } from "@/lib/formatTime";

export default function ClusterCard({ cluster }) {
  return (
    <div className="border-b border-gridline pb-4">
      <h3 className="text-lg font-semibold leading-snug text-ink">{cluster.label}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent-strong">
          {cluster.articleCount} article{cluster.articleCount === 1 ? "" : "s"}
        </span>
        <span className="text-ink-secondary">{formatRange(cluster.startTime, cluster.endTime)}</span>
      </div>
    </div>
  );
}

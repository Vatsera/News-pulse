/**
 * components/SourceFilter.jsx
 * Lets the user toggle which news sources are included. The source list
 * comes from whatever is actually in the data (computed by the parent
 * from the timeline response) -- nothing here is hardcoded to "BBC/NPR".
 */

export default function SourceFilter({ sources, selected, onToggle, onSelectAll, sourceColorMap }) {
  const allSelected = selected.size === sources.length;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by source">
      <button
        type="button"
        onClick={onSelectAll}
        aria-pressed={allSelected}
        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          allSelected
            ? "border-accent bg-accent/10 text-accent-strong"
            : "border-border text-ink-secondary hover:bg-page"
        }`}
      >
        All sources
      </button>

      {sources.map((source) => {
        const isActive = selected.has(source);
        const color = sourceColorMap[source];
        return (
          <button
            key={source}
            type="button"
            onClick={() => onToggle(source)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-border bg-surface text-ink"
                : "border-transparent text-muted hover:bg-page"
            }`}
          >
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${color.dot}`} />
            {source}
          </button>
        );
      })}
    </div>
  );
}

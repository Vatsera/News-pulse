/**
 * components/EmptyState.jsx
 * Shared "nothing to show, and here's why" box. Used for an empty
 * database, a source filter that matches nothing, and the "pick a
 * cluster" hint in the detail panel -- same visual treatment, different
 * copy, so the page never just goes blank.
 */

export default function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gridline px-6 py-12 text-center">
      <h3 className="font-medium text-ink">{title}</h3>
      {message && <p className="max-w-sm text-sm text-ink-secondary">{message}</p>}
      {action}
    </div>
  );
}

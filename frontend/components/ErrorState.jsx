/**
 * components/ErrorState.jsx
 * Friendly, consistent error display. Always shows a plain-language
 * message (the message strings themselves are written to be safe to show
 * -- see lib/api.js and the backend's error handler, which never leaks
 * stack traces to the client) plus an optional retry action.
 */

export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-gridline bg-surface px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-critical/10 text-critical"
      >
        !
      </div>
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-secondary">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-page"
        >
          Try again
        </button>
      )}
    </div>
  );
}

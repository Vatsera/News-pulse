/**
 * components/LoadingState.jsx
 * One consistent spinner + message, reused everywhere the app waits on
 * data (initial page load, retry-in-flight). Never leaves the page blank.
 */

export default function LoadingState({ message = "Loading…", fullPage = false }) {
  return (
    <div
      className={
        fullPage
          ? "flex min-h-screen flex-col items-center justify-center gap-3"
          : "flex flex-col items-center justify-center gap-3 py-16"
      }
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-gridline border-t-accent"
      />
      <p className="text-sm text-ink-secondary">{message}</p>
    </div>
  );
}

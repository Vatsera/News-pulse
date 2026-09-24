/**
 * lib/formatTime.js
 * Small date-formatting helpers shared by ArticleCard, ClusterCard, and
 * Timeline, so every part of the UI displays timestamps the same way.
 */

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatDateTime(value) {
  return dateTimeFormat.format(new Date(value));
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** A compact "Sep 21, 3:09 AM – 7:45 AM" (or "Sep 20 – Sep 21" for multi-day) range. */
export function formatRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (start.getTime() === end.getTime()) {
    return dateTimeFormat.format(start);
  }

  if (isSameDay(start, end)) {
    return `${dateTimeFormat.format(start)} – ${timeFormat.format(end)}`;
  }

  return `${dayFormat.format(start)} – ${dayFormat.format(end)}`;
}

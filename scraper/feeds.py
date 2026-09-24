"""
feeds.py
Responsibility: know which RSS feeds we read, fetch them, and turn every
entry into one consistent dictionary shape -- no matter how messy the
original feed is.
"""

import html
import re
import time
from datetime import datetime, timezone

import feedparser

_HTML_TAG_PATTERN = re.compile(r"<[^>]+>")


def _strip_html(raw: str) -> str:
    """
    RSS <description>/<content:encoded> fields often contain raw HTML --
    <img> tracking pixels, <p> tags, etc (NPR does this heavily). Strip
    tags and unescape entities so downstream cleaning/keyword extraction
    only ever sees plain text, not markup like "src" or "png".
    """
    without_tags = _HTML_TAG_PATTERN.sub(" ", raw)
    return html.unescape(without_tags)

# Three real, public RSS feeds. Add/remove sources here only -- nothing
# else in the file needs to change.
FEEDS = [
    {"source": "BBC News", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
    {"source": "NPR", "url": "https://feeds.npr.org/1001/rss.xml"},
    {"source": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml"},
]


def fetch_feed(feed_url: str):
    """Download and parse one RSS feed. Returns a feedparser FeedParserDict."""
    parsed = feedparser.parse(feed_url)

    # feedparser does not raise on network/parsing errors -- it just sets
    # `bozo` (1 = something went wrong) and still returns whatever it could
    # salvage. We treat "no entries at all" as a hard failure for this feed.
    if parsed.bozo and not parsed.entries:
        raise ValueError(f"Could not parse feed: {feed_url} ({parsed.bozo_exception})")

    return parsed


def _get_summary(entry) -> str:
    """
    Different feeds put the article summary in different places:
    - <description> usually lands in entry.summary
    - <content:encoded> lands in entry.content (a list of dicts)
    We try the richer field first and fall back gracefully.
    """
    if entry.get("content"):
        value = entry["content"][0].get("value", "")
        if value:
            return _strip_html(value)
    return _strip_html(entry.get("summary", "") or entry.get("description", ""))


def _get_published_at(entry) -> datetime:
    """
    Normalize whatever date field the feed gives us into a real
    timezone-aware datetime. feedparser already converts most valid RFC822
    dates into `published_parsed` (a time.struct_time) for us, so we lean on
    that instead of hand-parsing strings ourselves. If it's missing, we fall
    back to "now" so the article can still be sorted on a timeline.
    """
    struct = entry.get("published_parsed") or entry.get("updated_parsed")
    if struct:
        return datetime.fromtimestamp(time.mktime(struct), tz=timezone.utc)
    return datetime.now(timezone.utc)


def normalize_entry(entry, source: str) -> dict | None:
    """
    Convert one raw feedparser entry into our internal article schema.
    Returns None if the entry is missing something we can't work without
    (title or link) -- the caller should just skip it, not crash.
    """
    title = entry.get("title", "").strip()
    url = entry.get("link", "").strip()

    if not title or not url:
        return None

    return {
        "title": title,
        "summary": _get_summary(entry).strip(),
        "body": "",  # filled in later by extractor.py
        "source": source,
        "url": url,
        "published_at": _get_published_at(entry),
    }


def collect_all_entries() -> list[dict]:
    """Fetch every configured feed and return a flat list of normalized articles."""
    all_articles = []

    for feed in FEEDS:
        try:
            parsed = fetch_feed(feed["url"])
        except Exception as exc:
            print(f"[feeds] Skipping '{feed['source']}': {exc}")
            continue

        skipped = 0
        for entry in parsed.entries:
            article = normalize_entry(entry, feed["source"])
            if article is None:
                skipped += 1
                continue
            all_articles.append(article)

        print(f"[feeds] {feed['source']}: {len(parsed.entries)} entries, "
              f"{skipped} skipped (missing title/link)")

    return all_articles

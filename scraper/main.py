"""
main.py
Responsibility: orchestrate the whole pipeline, end to end. This is the
only file you run directly.

    RSS feeds -> normalize -> skip known URLs -> fetch full article pages
    -> clean text -> cluster by keyword overlap -> save to MongoDB

Design decision (documented in README too): article *extraction* only
happens for genuinely new URLs (that's the expensive network-bound part),
but *clustering* re-runs over every article in the database each time.
Word-overlap clustering has no cheap way to fold one new article into
existing clusters without reconsidering the whole set, and at this
project's scale (a few hundred articles) recomputing it every run is fast
and keeps clusters consistent.
"""

import concurrent.futures

import cleaner
import clustering
import database
import feeds
from extractor import extract_article_body

MAX_CONCURRENT_EXTRACTIONS = 5


def build_keywords(article: dict) -> set[str]:
    """Keywords used for clustering come from title + summary only (not the
    full body) -- this matches the assessment's Option A description and
    keeps clustering fast and focused on what the story is actually about,
    rather than every incidental word in the full article text."""
    return cleaner.extract_keywords(f"{article['title']} {article['summary']}")


def fetch_new_articles(existing_urls: set[str]) -> list[dict]:
    """Pull every feed, keep only articles we haven't stored before, and
    fetch/clean each one. A failure on any single article never stops the
    rest of the run."""
    raw_articles = feeds.collect_all_entries()

    seen_in_this_run = set()
    new_articles = []
    for article in raw_articles:
        url = article["url"]
        if url in existing_urls or url in seen_in_this_run:
            continue
        seen_in_this_run.add(url)
        new_articles.append(article)

    print(f"[main] {len(raw_articles)} total entries fetched, "
          f"{len(new_articles)} are new")

    processed = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_CONCURRENT_EXTRACTIONS) as pool:
        bodies = pool.map(extract_article_body, [a["url"] for a in new_articles])

        for i, (article, body) in enumerate(zip(new_articles, bodies), start=1):
            print(f"[main] ({i}/{len(new_articles)}) Extracted: {article['title'][:70]}")

            article["body"] = body if body else article["summary"]
            article["keywords"] = build_keywords(article)
            processed.append(article)

    return processed


def run() -> None:
    db = database.get_db()

    existing_urls = database.get_existing_urls(db)
    print(f"[main] {len(existing_urls)} articles already in the database")

    new_articles = fetch_new_articles(existing_urls)

    inserted_count = database.insert_new_articles(db, new_articles)
    print(f"[main] Inserted {inserted_count} new articles")

    all_articles = database.get_all_articles(db)
    for article in all_articles:
        article["keywords"] = set(article["keywords"])

    clusters = clustering.cluster_articles(all_articles)
    database.save_clustering_results(db, clusters)

    print(f"[main] Clustered {len(all_articles)} articles into {len(clusters)} clusters")
    for cluster in sorted(clusters, key=lambda c: len(c["articles"]), reverse=True)[:10]:
        print(f"        - '{cluster['label']}' ({len(cluster['articles'])} articles)")

    print("[main] Done.")


if __name__ == "__main__":
    run()

"""
database.py
Responsibility: all MongoDB access lives here. Nothing else in the project
should import pymongo directly -- main.py just calls these functions.

Two collections:
  - articles: one document per article (source of truth, deduplicated by URL)
  - clusters: one document per topic cluster, rebuilt every run so it always
    reflects the current clustering of *all* articles in the DB.
"""

import os

from dotenv import load_dotenv
from pymongo import ASCENDING, MongoClient, UpdateOne

load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "news_pulse")


def get_db():
    """Open a connection and return the database handle."""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    _ensure_indexes(db)
    return db


def _ensure_indexes(db):
    # Unique index on url is what actually guarantees no duplicate articles,
    # even if two feeds/entries ever pointed to the same story.
    db.articles.create_index([("url", ASCENDING)], unique=True)


def get_existing_urls(db) -> set[str]:
    """All article URLs already stored -- used to skip re-scraping/re-extracting them."""
    return {doc["url"] for doc in db.articles.find({}, {"url": 1})}


def insert_new_articles(db, articles: list[dict]) -> int:
    """
    Insert articles that don't exist yet. Uses the unique index on `url` as
    a safety net (skip_duplicate_errors), so even a race between two runs
    can't create duplicates.
    Returns the number of articles actually inserted.
    """
    if not articles:
        return 0

    for article in articles:
        article["keywords"] = list(article["keywords"])
        article.setdefault("cluster_id", None)
        article.setdefault("cluster_label", None)

    inserted = 0
    for article in articles:
        try:
            db.articles.insert_one(article)
            inserted += 1
        except Exception as exc:
            # Most likely a duplicate key error if the same URL slipped
            # through twice in one run -- safe to skip, not a fatal error.
            print(f"[database] Skipped insert for {article.get('url')}: {exc}")

    return inserted


def get_all_articles(db) -> list[dict]:
    """Every article currently stored, used as clustering input."""
    return list(db.articles.find({}))


def save_clustering_results(db, clusters: list[dict]) -> None:
    """
    Persist the latest clustering pass:
      1. Rebuild the `clusters` collection from scratch (cheap, and avoids
         having to diff old vs. new clusters).
      2. Update every article with its (possibly new) cluster_id/label.
    """
    db.clusters.delete_many({})

    article_updates = []

    for cluster in clusters:
        member_articles = cluster["articles"]
        published_dates = [a["published_at"] for a in member_articles]

        cluster_doc = {
            "label": cluster["label"],
            "article_count": len(member_articles),
            "start_time": min(published_dates),
            "end_time": max(published_dates),
        }
        result = db.clusters.insert_one(cluster_doc)
        cluster_id = result.inserted_id

        for article in member_articles:
            article_updates.append(
                UpdateOne(
                    {"_id": article["_id"]},
                    {"$set": {"cluster_id": cluster_id, "cluster_label": cluster["label"]}},
                )
            )

    if article_updates:
        db.articles.bulk_write(article_updates)

"""
clustering.py
Responsibility: Option A -- keyword/word-overlap grouping. Take a list of
articles (each with a pre-computed `keywords` set) and group the ones that
are probably about the same story, with no ML involved.

Algorithm (single pass, greedy):
  For each article, in published-date order:
    - compare its keywords against every existing cluster's keyword pool
    - if the best match is "similar enough", join that cluster
    - otherwise start a brand new cluster
This is deliberately simple: one pass over the data, no external libraries,
easy to explain and to reason about.
"""

from collections import Counter

# --- Tunable thresholds -----------------------------------------------
# MIN_SHARED_WORDS: raw number of overlapping keywords required before we
# even consider two articles related (mirrors the assessment's own example
# of "share 4+ meaningful words").
# MIN_JACCARD: shared / union of keywords. Guards against two long articles
# that happen to share 4 common-ish words but are otherwise unrelated --
# raw count alone rewards long articles too easily.
# Both were picked by running the pipeline against real BBC/NPR/Al Jazeera
# output and adjusting until same-story articles grouped together and
# unrelated articles didn't. See README for the specific examples.
MIN_SHARED_WORDS = 3
MIN_JACCARD = 0.15
# -----------------------------------------------------------------------


def _similarity(keywords_a: set, keywords_b: set) -> tuple[int, float]:
    """Return (shared word count, Jaccard similarity) between two keyword sets."""
    shared = keywords_a & keywords_b
    union = keywords_a | keywords_b
    jaccard = len(shared) / len(union) if union else 0.0
    return len(shared), jaccard


def cluster_articles(articles: list[dict]) -> list[dict]:
    """
    Group articles by keyword overlap.

    Input: list of article dicts, each with a "keywords" set/list and
    "published_at" datetime.
    Output: list of clusters, each shaped like:
        {
            "label": "climate energy policy",
            "keywords": {...union of all member keywords...},
            "articles": [article, article, ...],
        }
    """
    articles_sorted = sorted(articles, key=lambda a: a["published_at"])
    clusters: list[dict] = []

    for article in articles_sorted:
        article_keywords = set(article["keywords"])

        best_cluster = None
        best_jaccard = 0.0

        for cluster in clusters:
            shared_count, jaccard = _similarity(article_keywords, cluster["keywords"])
            if shared_count >= MIN_SHARED_WORDS and jaccard >= MIN_JACCARD:
                if jaccard > best_jaccard:
                    best_jaccard = jaccard
                    best_cluster = cluster

        if best_cluster is not None:
            best_cluster["articles"].append(article)
            best_cluster["keywords"] |= article_keywords
        else:
            clusters.append({"keywords": set(article_keywords), "articles": [article]})

    for cluster in clusters:
        cluster["label"] = _generate_label(cluster["articles"])

    return clusters


def _generate_label(cluster_articles: list[dict]) -> str:
    """
    Build a human-readable label from the words that show up most often
    across the cluster's articles (not just the ever-growing keyword
    union, which would over-weight big articles).
    """
    word_counts = Counter()
    for article in cluster_articles:
        word_counts.update(set(article["keywords"]))

    top_words = [word for word, _ in word_counts.most_common(3)]
    return " ".join(top_words).title() if top_words else "Untitled Cluster"

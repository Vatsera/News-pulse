"""
cleaner.py
Responsibility: turn raw article text into a set of meaningful, comparable
keywords -- lowercase, no punctuation, no filler ("stop") words, no
one/two-letter noise. This is what clustering.py compares between articles.
"""

import re

# A small, self-contained stopword list. Hardcoded on purpose -- it avoids
# an extra dependency (e.g. nltk) and its separate one-time data download,
# which is one less thing that can fail during evaluation.
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an",
    "and", "any", "are", "aren't", "as", "at", "be", "because", "been",
    "before", "being", "below", "between", "both", "but", "by", "can",
    "could", "did", "do", "does", "doing", "down", "during", "each", "few",
    "for", "from", "further", "had", "has", "have", "having", "he", "her",
    "here", "hers", "herself", "him", "himself", "his", "how", "i", "if",
    "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most",
    "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over",
    "own", "s", "same", "she", "should", "so", "some", "such", "than",
    "that", "the", "their", "theirs", "them", "themselves", "then",
    "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "we", "were", "what", "when",
    "where", "which", "while", "who", "whom", "why", "will", "with",
    "would", "you", "your", "yours", "yourself", "yourselves",
    # words that show up constantly in news writing but carry no topic
    # signal on their own
    "says", "said", "new", "news", "report", "reports", "reported",
    "also", "after", "first", "year", "years", "could", "may", "one", "two",
}

MIN_WORD_LENGTH = 3

_WORD_PATTERN = re.compile(r"[a-z]+")


def clean_text(text: str) -> str:
    """Lowercase and strip everything that isn't a letter or whitespace."""
    if not text:
        return ""
    return text.lower()


def extract_keywords(text: str) -> set[str]:
    """
    Turn free text into a set of meaningful lowercase words.
    e.g. "Government announces new climate policy!" ->
         {"government", "announces", "climate", "policy"}
    """
    lowered = clean_text(text)
    words = _WORD_PATTERN.findall(lowered)

    return {
        word
        for word in words
        if len(word) >= MIN_WORD_LENGTH and word not in STOPWORDS
    }

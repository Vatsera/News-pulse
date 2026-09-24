"""
extractor.py
Responsibility: given an article URL, fetch the actual webpage and pull out
the main body text (not nav bars, ads, comments, etc). Must never crash the
whole pipeline just because one page is slow, blocked, or malformed.
"""

import requests
import trafilatura

REQUEST_TIMEOUT_SECONDS = 10
USER_AGENT = "Mozilla/5.0 (compatible; NewsPulseBot/1.0; +https://example.com)"


def extract_article_body(url: str) -> str | None:
    """
    Fetch `url` and extract the main article text.
    Returns the extracted text, or None if fetching/extraction fails for
    any reason. Callers should treat None as "keep the RSS summary instead".
    """
    try:
        response = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"[extractor] Failed to fetch {url}: {exc}")
        return None

    try:
        body = trafilatura.extract(
            response.text,
            include_comments=False,
            include_tables=False,
        )
    except Exception as exc:
        print(f"[extractor] Failed to parse {url}: {exc}")
        return None

    if not body:
        print(f"[extractor] No extractable body found for {url}")
        return None

    return body.strip()

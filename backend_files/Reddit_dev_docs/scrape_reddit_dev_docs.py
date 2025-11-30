from __future__ import annotations

import re
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, List, Tuple
from unicodedata import normalize
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

USER_AGENT = "Mozilla/5.0 (compatible; tracking-agents-scraper/0.3)"
TIMEOUT = 20
OUTPUT_DIR = Path(__file__).resolve().parent
TARGETS: List[Tuple[str, str]] = [
    ("api-oauth", "https://www.reddit.com/dev/api/oauth"),
    ("api", "https://www.reddit.com/dev/api"),
]
BLOCK_TAGS = {"p", "div", "section", "article", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6"}


class ContentsParser(HTMLParser):
    """Extract text contained inside div.contents."""

    def __init__(self) -> None:
        super().__init__()
        self.depth = 0
        self.parts: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag == "div":
            classes = set((attrs_dict.get("class") or "").split())
            if self.depth == 0 and "contents" in classes:
                self.depth = 1
                return
        if self.depth > 0:
            self.depth += 1
            if tag in BLOCK_TAGS or tag == "br":
                self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self.depth > 0:
            if tag in BLOCK_TAGS:
                self.parts.append("\n")
            self.depth -= 1

    def handle_data(self, data: str) -> None:
        if self.depth == 0:
            return
        text = data.strip()
        if text:
            self.parts.append(text)

    def collected_text(self) -> str:
        raw = " ".join(self.parts)
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r"\n\s*\n\s*", "\n\n", raw)
        raw = re.sub(r" ?\n ?", "\n", raw)
        raw = normalize("NFKD", raw)
        ascii_only = raw.encode("ascii", "ignore").decode("ascii")
        return ascii_only.strip()


def fetch_html(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=TIMEOUT) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset, errors="ignore")
    except HTTPError as http_error:
        raise RuntimeError(f"HTTP error while fetching {url}: {http_error.code}") from http_error
    except URLError as url_error:
        raise RuntimeError(f"Network error while fetching {url}: {url_error.reason}") from url_error


def extract_contents(html: str) -> str:
    parser = ContentsParser()
    parser.feed(html)
    text = parser.collected_text()
    if not text:
        raise RuntimeError("No text captured from div.contents")
    return text


def write_output(slug: str, url: str, text: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"{slug}.txt"
    path.write_text(f"URL: {url}\n\n{text}\n", encoding="utf-8")


def scrape_all(targets: Iterable[Tuple[str, str]]) -> None:
    for index, (slug, url) in enumerate(targets):
        print(f"[{index + 1}/{len(TARGETS)}] Fetching {url} ...")
        html = fetch_html(url)
        text = extract_contents(html)
        write_output(slug, url, text)
        time.sleep(1)
    print(f"Wrote {len(TARGETS)} files to {OUTPUT_DIR}")


if __name__ == "__main__":
    scrape_all(TARGETS)

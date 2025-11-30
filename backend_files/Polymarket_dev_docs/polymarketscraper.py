from __future__ import annotations

import re
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Iterable, List, Tuple
from urllib.request import Request, urlopen

DOCS_ORIGIN = "https://docs.polymarket.com"
NAV_ROOT = "https://docs.polymarket.com/quickstart/introduction/main"
USER_AGENT = "Mozilla/5.0 (compatible; tracking-agents-scraper/0.2)"
TIMEOUT = 20

# Sections we currently expect, grouped by header.
SECTION_MAP: Dict[str, List[Tuple[str, str]]] = {
    "Developer Quickstart": [
        ("Developer Quickstart", "https://docs.polymarket.com/quickstart/introduction/main"),
        ("Your First Order", "https://docs.polymarket.com/quickstart/orders/first-order"),
        ("Glossary", "https://docs.polymarket.com/quickstart/introduction/definitions"),
        ("API Rate Limits", "https://docs.polymarket.com/quickstart/introduction/rate-limits"),
        ("Endpoints", "https://docs.polymarket.com/developers/CLOB/endpoints"),
    ],
    "Polymarket Builders Program": [
        ("Builder Program Introduction", "https://docs.polymarket.com/developers/builders/builder-intro"),
        ("Builder Profile & Keys", "https://docs.polymarket.com/developers/builders/builder-profile"),
        ("Order Attribution", "https://docs.polymarket.com/developers/builders/order-attribution"),
        ("Builder Signing Server", "https://docs.polymarket.com/developers/builders/builder-signing-server"),
        ("Relayer Client", "https://docs.polymarket.com/developers/builders/relayer-client"),
    ],
    "Central Limit Order Book": [
        ("CLOB Introduction", "https://docs.polymarket.com/developers/CLOB/introduction"),
        ("Status", "https://docs.polymarket.com/developers/CLOB/status"),
        ("Clients", "https://docs.polymarket.com/developers/CLOB/clients"),
        ("Authentication", "https://docs.polymarket.com/developers/CLOB/authentication"),
    ],
    "CLOB Requests": [
        ("Get order book summary", "https://docs.polymarket.com/api-reference/orderbook/get-order-book-summary"),
        ("Get multiple order books summaries by request", "https://docs.polymarket.com/api-reference/orderbook/get-multiple-order-books-summaries-by-request"),
        ("Get market price", "https://docs.polymarket.com/api-reference/pricing/get-market-price"),
        ("Get multiple market prices", "https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices"),
        ("Get multiple market prices by request", "https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices-by-request"),
        ("Get midpoint price", "https://docs.polymarket.com/api-reference/pricing/get-midpoint-price"),
        ("Get price history for a traded token", "https://docs.polymarket.com/api-reference/pricing/get-price-history-for-a-traded-token"),
        ("Get bid-ask spreads", "https://docs.polymarket.com/api-reference/spreads/get-bid-ask-spreads"),
    ],
    "Order Manipulation": [
        ("Orders Overview", "https://docs.polymarket.com/developers/CLOB/orders/orders"),
        ("Place Single Order", "https://docs.polymarket.com/developers/CLOB/orders/create-order"),
        ("Place Multiple Orders (Batching)", "https://docs.polymarket.com/developers/CLOB/orders/create-order-batch"),
        ("Get Order", "https://docs.polymarket.com/developers/CLOB/orders/get-order"),
        ("Get Active Orders", "https://docs.polymarket.com/developers/CLOB/orders/get-active-order"),
        ("Check Order Reward Scoring", "https://docs.polymarket.com/developers/CLOB/orders/check-scoring"),
        ("Cancel Orders(s)", "https://docs.polymarket.com/developers/CLOB/orders/cancel-orders"),
        ("Onchain Order Info", "https://docs.polymarket.com/developers/CLOB/orders/onchain-order-info"),
    ],
    "Trades": [
        ("Trades Overview", "https://docs.polymarket.com/developers/CLOB/trades/trades-overview"),
        ("Get Trades", "https://docs.polymarket.com/developers/CLOB/trades/trades"),
    ],
    "Websocket": [
        ("WSS Overview", "https://docs.polymarket.com/developers/CLOB/websocket/wss-overview"),
        ("WSS Quickstart", "https://docs.polymarket.com/quickstart/websocket/WSS-Quickstart"),
        ("WSS Authentication", "https://docs.polymarket.com/developers/CLOB/websocket/wss-auth"),
        ("User Channel", "https://docs.polymarket.com/developers/CLOB/websocket/user-channel"),
        ("Market Channel", "https://docs.polymarket.com/developers/CLOB/websocket/market-channel"),
    ],
    "Real Time Data Stream": [
        ("RTDS Overview", "https://docs.polymarket.com/developers/RTDS/RTDS-overview"),
        ("RTDS Crypto Prices", "https://docs.polymarket.com/developers/RTDS/RTDS-crypto-prices"),
        ("RTDS Comments", "https://docs.polymarket.com/developers/RTDS/RTDS-comments"),
    ],
    "Gamma Structure": [
        ("Overview", "https://docs.polymarket.com/developers/gamma-markets-api/overview"),
        ("Gamma Structure", "https://docs.polymarket.com/developers/gamma-markets-api/gamma-structure"),
        ("Fetching Markets", "https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide"),
    ],
    "Gamma Endpoints": [
        ("Health", "https://docs.polymarket.com/api-reference/health/health-check"),
        ("List teams", "https://docs.polymarket.com/api-reference/sports/list-teams"),
        ("Get sports metadata information", "https://docs.polymarket.com/api-reference/sports/get-sports-metadata-information"),
        ("List tags", "https://docs.polymarket.com/api-reference/tags/list-tags"),
        ("Get tag by id", "https://docs.polymarket.com/api-reference/tags/get-tag-by-id"),
        ("Get tag by slug", "https://docs.polymarket.com/api-reference/tags/get-tag-by-slug"),
        ("Get related tags (relationships) by tag id", "https://docs.polymarket.com/api-reference/tags/get-related-tags-relationships-by-tag-id"),
        ("Get related tags (relationships) by tag slug", "https://docs.polymarket.com/api-reference/tags/get-related-tags-relationships-by-tag-slug"),
        ("Get tags related to a tag id", "https://docs.polymarket.com/api-reference/tags/get-tags-related-to-a-tag-id"),
        ("Get tags related to a tag slug", "https://docs.polymarket.com/api-reference/tags/get-tags-related-to-a-tag-slug"),
        ("List events", "https://docs.polymarket.com/api-reference/events/list-events"),
        ("Get event by id", "https://docs.polymarket.com/api-reference/events/get-event-by-id"),
        ("Get event tags", "https://docs.polymarket.com/api-reference/events/get-event-tags"),
        ("Get event by slug", "https://docs.polymarket.com/api-reference/events/get-event-by-slug"),
        ("List markets", "https://docs.polymarket.com/api-reference/markets/list-markets"),
        ("Get market by id", "https://docs.polymarket.com/api-reference/markets/get-market-by-id"),
        ("Get market tags by id", "https://docs.polymarket.com/api-reference/markets/get-market-tags-by-id"),
        ("Get market by slug", "https://docs.polymarket.com/api-reference/markets/get-market-by-slug"),
        ("List series", "https://docs.polymarket.com/api-reference/series/list-series"),
        ("Get series by id", "https://docs.polymarket.com/api-reference/series/get-series-by-id"),
        ("List comments", "https://docs.polymarket.com/api-reference/comments/list-comments"),
        ("Get comments by comment id", "https://docs.polymarket.com/api-reference/comments/get-comments-by-comment-id"),
        ("Get comments by user address", "https://docs.polymarket.com/api-reference/comments/get-comments-by-user-address"),
        ("Search markets, events, and profiles", "https://docs.polymarket.com/api-reference/search/search-markets-events-and-profiles"),
    ],
    "Bridge & Swap": [
        ("Overview", "https://docs.polymarket.com/developers/misc-endpoints/bridge-overview"),
        ("Create Deposit", "https://docs.polymarket.com/developers/misc-endpoints/bridge-deposit"),
        ("Get Supported Assets", "https://docs.polymarket.com/developers/misc-endpoints/bridge-supported-assets"),
    ],
    "Subgraph": [
        ("Overview", "https://docs.polymarket.com/developers/subgraph/overview"),
    ],
    "Resolution": [
        ("Resolution", "https://docs.polymarket.com/developers/resolution/UMA"),
    ],
    "Rewards": [
        ("Liquidity Rewards", "https://docs.polymarket.com/developers/rewards/overview"),
    ],
    "Conditional Token Frameworks": [
        ("Overview", "https://docs.polymarket.com/developers/CTF/overview"),
        ("Splitting USDC", "https://docs.polymarket.com/developers/CTF/split"),
        ("Merging Tokens", "https://docs.polymarket.com/developers/CTF/merge"),
        ("Reedeeming Tokens", "https://docs.polymarket.com/developers/CTF/redeem"),
        ("Deployment and Additional Information", "https://docs.polymarket.com/developers/CTF/deployment-resources"),
    ],
    "Proxy Wallets": [
        ("Proxy wallet", "https://docs.polymarket.com/developers/proxy-wallet"),
    ],
    "Negative Risk": [
        ("Overview", "https://docs.polymarket.com/developers/neg-risk/overview"),
    ],
    "Data-API": [
        ("Health check", "https://docs.polymarket.com/api-reference/health/health-check"),
        ("Get closed positions for a user", "https://docs.polymarket.com/api-reference/core/get-closed-positions-for-a-user"),
        ("Get current positions for a user", "https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user"),
        ("Get top holders for markets", "https://docs.polymarket.com/api-reference/core/get-top-holders-for-markets"),
        ("Get total value of a user's positions", "https://docs.polymarket.com/api-reference/core/get-total-value-of-a-users-positions"),
        ("Get trades for a user or markets", "https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets"),
        ("Get user activity", "https://docs.polymarket.com/api-reference/core/get-user-activity"),
        ("Get live volume for an event", "https://docs.polymarket.com/api-reference/misc/get-live-volume-for-an-event"),
        ("Get open interest", "https://docs.polymarket.com/api-reference/misc/get-open-interest"),
        ("Get total markets a user has traded", "https://docs.polymarket.com/api-reference/misc/get-total-markets-a-user-has-traded"),
        ("Get aggregated builder leaderboard", "https://docs.polymarket.com/api-reference/builders/get-aggregated-builder-leaderboard"),
        ("Get daily builder volume time series", "https://docs.polymarket.com/api-reference/builders/get-daily-builder-volume-time-series"),
    ],
}


def slugify(text: str) -> str:
    text = text.strip().replace("'", "")
    text = re.sub(r"[^A-Za-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "page"


def header_dir(header: str) -> str:
    return header.replace(" ", "_")


def absolute_url(href: str) -> str:
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("/"):
        return DOCS_ORIGIN.rstrip("/") + href
    return DOCS_ORIGIN.rstrip("/") + "/" + href


def collect_expected_titles() -> set[str]:
    titles: set[str] = set()
    for items in SECTION_MAP.values():
        for title, _ in items:
            titles.add(title.strip())
    return titles


class ContentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.depth = 0
        self.parts: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag == "div" and attrs_dict.get("id") == "content-area":
            self.depth = 1
        elif self.depth > 0:
            self.depth += 1

    def handle_endtag(self, tag: str) -> None:
        if self.depth > 0:
            self.depth -= 1

    def handle_data(self, data: str) -> None:
        if self.depth > 0:
            text = data.strip()
            if text:
                self.parts.append(text)


class NavParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_nav = False
        self.capture = False
        self.stack: List[str] = []
        self.items: List[Tuple[str, str]] = []
        self.current_href: str | None = None

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag == "div" and attrs_dict.get("id") == "navigation-items":
            self.in_nav = True
        if self.in_nav and tag == "a":
            self.capture = True
            href = attrs_dict.get("href")
            if href:
                self.current_href = href

    def handle_endtag(self, tag: str) -> None:
        if self.in_nav and tag == "a" and self.capture:
            text = "".join(self.stack).strip()
            href = self.current_href
            if text and href:
                self.items.append((text, href))
            self.stack.clear()
            self.capture = False
            self.current_href = None

    def handle_data(self, data: str) -> None:
        if self.in_nav and self.capture:
            self.stack.append(data)


def fetch_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=TIMEOUT) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def extract_content(html: str) -> str:
    parser = ContentParser()
    parser.feed(html)
    raw_lines = parser.parts
    filtered: List[str] = []
    noisy_markers = (
        "__next_f",
        "static/chunks/",
        "/mintlify-assets/_next/static",
        ':"$Sreact',
        ":HL[",
    )

    for line in raw_lines:
        if any(marker in line for marker in noisy_markers):
            continue
        filtered.append(line)

    return "\n".join(filtered)


def parse_navigation(url: str) -> List[Tuple[str, str]]:
    html = fetch_html(url)
    parser = NavParser()
    parser.feed(html)
    return parser.items


def collect_known_urls() -> Dict[str, str]:
    known: Dict[str, str] = {}
    for items in SECTION_MAP.values():
        for title, url in items:
            known[absolute_url(url)] = title
    return known


def process_page(data_dir: Path, header: str, title: str, url: str) -> Tuple[str, Path]:
    html = fetch_html(url)
    content_text = extract_content(html)
    header_path = data_dir / header_dir(header)
    header_path.mkdir(parents=True, exist_ok=True)
    filename = f"{slugify(title)}.txt"
    file_path = header_path / filename
    new_body = f"URL: {url}\n\n{content_text}\n"

    if file_path.exists():
        existing = file_path.read_text(encoding="utf-8")
        if existing == new_body:
            return "unchanged", file_path
        file_path.write_text(new_body, encoding="utf-8")
        return "updated", file_path

    file_path.write_text(new_body, encoding="utf-8")
    return "created", file_path


def build_aggregate(data_dir: Path, aggregate_path: Path | None) -> bool:
    # Aggregation disabled; the system consumes per-page files directly.
    return False


def log_calendar(calendar_path: Path, created: int, updated: int, new_nav_urls: int, new_nav_titles: int) -> None:
    timestamp = datetime.now().isoformat(timespec="seconds")
    status = "changes" if (created or updated or new_nav_urls or new_nav_titles) else "no_changes"
    line = (
        f"{timestamp} | status={status} | created={created} | updated={updated} | "
        f"new_nav_urls={new_nav_urls} | new_nav_titles={new_nav_titles}"
    )
    calendar_path.parent.mkdir(parents=True, exist_ok=True)
    with calendar_path.open("a", encoding="utf-8") as cal:
        cal.write(line + "\n")


def unique_new_nav(nav_items: Iterable[Tuple[str, str]], known_urls: Dict[str, str]) -> List[Tuple[str, str]]:
    seen: set[str] = set()
    new_items: List[Tuple[str, str]] = []
    for text, href in nav_items:
        abs_url = absolute_url(href)
        if not abs_url.startswith(DOCS_ORIGIN):
            continue
        if abs_url in known_urls:
            continue
        key = (text.strip(), abs_url)
        if key in seen:
            continue
        seen.add(key)
        new_items.append((text.strip() or abs_url, abs_url))
    return new_items


def unique_new_titles(nav_items: Iterable[Tuple[str, str]], expected_titles: set[str]) -> List[str]:
    seen: set[str] = set()
    extras: List[str] = []
    for text, _ in nav_items:
        name = text.strip()
        if not name:
            continue
        if name in expected_titles:
            continue
        if name in seen:
            continue
        seen.add(name)
        extras.append(name)
    return extras


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "PolymarketDocScrape"
    calendar_path = base_dir / "ScrapeCalendar.txt"

    data_dir.mkdir(parents=True, exist_ok=True)

    known_urls = collect_known_urls()
    expected_titles = collect_expected_titles()
    nav_items = parse_navigation(NAV_ROOT)
    new_nav_items = unique_new_nav(nav_items, known_urls)
    new_nav_titles = unique_new_titles(nav_items, expected_titles)

    created = 0
    updated = 0

    for header, items in SECTION_MAP.items():
        for title, url in items:
            status, _ = process_page(data_dir, header, title, absolute_url(url))
            if status == "created":
                created += 1
            elif status == "updated":
                updated += 1

    for title, url in new_nav_items:
        status, _ = process_page(data_dir, title, title, url)
        if status == "created":
            created += 1
        elif status == "updated":
            updated += 1

    build_aggregate(data_dir, None)
    log_calendar(calendar_path, created, updated, len(new_nav_items), len(new_nav_titles))

    print(
        f"Scrape complete. created={created}, updated={updated}, new_nav_urls={len(new_nav_items)}, new_nav_titles={len(new_nav_titles)}"
    )
    if new_nav_items:
        print("New navigation items detected:")
        for title, url in new_nav_items:
            print(f"- {title} ({url})")
    if new_nav_titles:
        print("New navigation titles detected (names not in SECTION_MAP):")
        for title in new_nav_titles:
            print(f"- {title}")


if __name__ == "__main__":
    main()

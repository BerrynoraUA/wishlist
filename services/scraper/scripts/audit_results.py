from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


BLOCKED_TITLES = (
    "access denied",
    "are you a robot",
    "captcha",
    "register & sign in",
    "site under construction",
)
OBSOLETE_TITLES = (
    "page you are looking for cannot be found",
    "page not found",
    "product not found",
)
PARSER_OVERRIDES = {
    "www.amazon.com": "Missing product-scoped price",
    "www.aliexpress.com": "Placeholder title and unrelated query-derived price",
    "ua-tao.com": "Malformed double-scheme image URL",
    "www.wildberries.ru": "Missing current price and currency",
    "www.target.com": "Price belongs to unrelated embedded product state",
    "www.flipkart.com": "Implausible price extracted from unrelated page content",
}
CRITERIA_OVERRIDES = {
    "www.ebay.com": "Regular and discount prices were compared as one field",
    "www.trendyol.com": "Expected locale, title and AED price are stale",
    "www.zalando.sk": "Expected title and CDN image are stale",
    "www.wayfair.com": "Title suffix policy and missing exact price criterion",
}


def classify(result: dict[str, Any]) -> tuple[str, str]:
    hostname = (urlparse(result["url"]).hostname or "").lower()
    if hostname in PARSER_OVERRIDES:
        return "parser_bug", PARSER_OVERRIDES[hostname]
    if hostname in CRITERIA_OVERRIDES:
        return "outdated_acceptance", CRITERIA_OVERRIDES[hostname]

    data = result.get("data") or {}
    title = str(data.get("title") or "").strip().lower()
    image = str(data.get("image") or "")
    missing = result.get("missingFields") or []
    validations = result.get("validations") or []
    has_mismatch = any("match=False" in str(validation) for validation in validations)

    if any(marker in title for marker in OBSOLETE_TITLES):
        return "obsolete_url", f"Non-product page title: {title[:80]}"
    if any(marker in title for marker in BLOCKED_TITLES):
        return "block_fetch_failure", f"Block/maintenance page parsed as product: {title[:80]}"
    if image.startswith(("https:https://", "http:http://")):
        return "parser_bug", "Malformed image URL"
    if result.get("status") == "failed" and not data:
        return "block_fetch_failure", result.get("error") or "No product response"
    if missing:
        return "parser_bug", f"Missing required fields: {', '.join(missing)}"
    if has_mismatch:
        return "criteria_or_parser_review", "Exact expected value differs from extracted value"
    if result.get("status") == "success":
        return "correct_result", "No reported mismatch"
    return "criteria_or_parser_review", f"Reported status: {result.get('status')}"


def escape(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    rows = []
    counts: Counter[str] = Counter()
    for index, result in enumerate(payload["results"], start=1):
        category, reason = classify(result)
        counts[category] += 1
        rows.append(
            (
                index,
                urlparse(result["url"]).hostname or result["url"],
                result.get("status"),
                category,
                reason,
            )
        )

    lines = [
        "# Scraper results audit — 2026-06-30",
        "",
        f"Source export: `{args.input.name}` ({len(rows)} results).",
        "",
        "This is a conservative first-pass classification. "
        "`criteria_or_parser_review` requires live evidence before changing code or expected data.",
        "",
        "## Summary",
        "",
        "| Category | Count |",
        "|---|---:|",
    ]
    lines.extend(f"| {escape(category)} | {count} |" for category, count in counts.most_common())
    lines.extend(
        [
            "",
            "## Results",
            "",
            "| # | Domain | Export status | Classification | Reason |",
            "|---:|---|---|---|---|",
        ]
    )
    lines.extend(
        f"| {index} | {escape(domain)} | {escape(status)} | "
        f"{escape(category)} | {escape(reason)} |"
        for index, domain, status, category, reason in rows
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

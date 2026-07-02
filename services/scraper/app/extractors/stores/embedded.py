import json
import re
from collections.abc import Iterable
from typing import Any
from urllib.parse import urlparse

from lxml import html

from app.extractors.normalization import (
    clean_text,
    normalize_currency,
    normalize_image_url,
    normalize_price,
)
from app.extractors.result import ExtractionResult
from app.models import ProductData


_DOMAINS = (
    "lamoda.ru",
    "lazada.",
    "meesho.com",
    "overstock.com",
    "emag.",
    "takealot.com",
    "cdiscount.com",
    "farfetch.com",
)
_TITLE_KEYS = ("title", "name", "productName", "product_name", "displayName")
_PRICE_KEYS = (
    "salePrice",
    "sale_price",
    "currentPrice",
    "current_price",
    "sellingPrice",
    "selling_price",
    "price",
)
_OLD_PRICE_KEYS = ("originalPrice", "original_price", "listPrice", "mrp", "retailPrice")
_IMAGE_KEYS = ("image", "imageUrl", "image_url", "mainImage", "main_image", "thumbnail")
_CURRENCY_KEYS = ("currency", "currencyCode", "priceCurrency")
_ID_KEYS = ("id", "productId", "product_id", "itemId", "item_id", "sku", "skuId")


def supports_embedded_store(page_url: str) -> bool:
    hostname = (urlparse(page_url).hostname or "").lower()
    return any(domain in hostname for domain in _DOMAINS)


def extract_embedded_store(html_text: str, page_url: str) -> ExtractionResult:
    expected_ids = _expected_ids(page_url)
    best: tuple[int, dict[str, Any]] | None = None
    document = html.fromstring(html_text or "<html></html>")
    for raw in document.xpath("//script/text()"):
        payload = _decode_script(raw)
        if payload is None:
            continue
        for candidate in _walk_dicts(payload):
            score = _candidate_score(candidate, expected_ids)
            if score >= 4 and (best is None or score > best[0]):
                best = (score, candidate)
    if best is None:
        return ExtractionResult(warnings=["embedded_product_state_not_found"])

    item = best[1]
    current = normalize_price(_first(item, _PRICE_KEYS))
    old = normalize_price(_first(item, _OLD_PRICE_KEYS))
    price = old if old and current and old != current else current
    discount = current if old and current and old != current else None
    image = _image_value(_first(item, _IMAGE_KEYS), page_url)
    product = ProductData(
        title=clean_text(_first(item, _TITLE_KEYS)),
        description=clean_text(item.get("description") or item.get("shortDescription")),
        image=image,
        price=price,
        discount_price=discount,
        has_discount=bool(discount),
        currency=normalize_currency(_first(item, _CURRENCY_KEYS)),
    )
    source = "store:embedded_state"
    sources = {
        field: source
        for field, value in product.model_dump().items()
        if value not in (None, False)
    }
    return ExtractionResult(product=product, sources=sources)


def _decode_script(raw: str) -> Any:
    value = raw.strip()
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, ValueError):
        pass
    # Common hydration assignments: window.__STATE__ = {...};
    match = re.search(r"(?:^|=)\s*({.*}|\[.*\])\s*;?\s*$", value, re.S)
    if match:
        try:
            return json.loads(match.group(1))
        except (json.JSONDecodeError, ValueError):
            return None
    return None


def _walk_dicts(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _walk_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_dicts(child)


def _candidate_score(item: dict[str, Any], expected_ids: set[str]) -> int:
    score = int(_first(item, _TITLE_KEYS) is not None) * 2
    score += int(_first(item, _PRICE_KEYS) is not None) * 2
    score += int(_first(item, _IMAGE_KEYS) is not None)
    candidate_ids = {
        str(item[key]).lower()
        for key in _ID_KEYS
        if item.get(key) is not None and not isinstance(item[key], (dict, list))
    }
    if expected_ids:
        if candidate_ids & expected_ids:
            score += 6
        elif candidate_ids:
            score -= 6
    return score


def _expected_ids(page_url: str) -> set[str]:
    path = urlparse(page_url).path.lower()
    values = re.findall(r"(?:pdp-i|/p/|/pd/|/plid|/item/|/)([a-z0-9]{5,})", path)
    values += re.findall(r"\b(\d{7,})\b", path)
    return set(values)


def _first(item: dict[str, Any], keys: tuple[str, ...]) -> Any:
    return next((item[key] for key in keys if item.get(key) not in (None, "")), None)


def _image_value(value: Any, page_url: str) -> str | None:
    if isinstance(value, list):
        value = value[0] if value else None
    if isinstance(value, dict):
        value = value.get("url") or value.get("src") or value.get("original")
    return normalize_image_url(value, page_url)

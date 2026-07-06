import json
import re
from urllib.parse import urlparse

from lxml import etree, html

from app.extractors.normalization import (
    clean_text,
    normalize_currency,
    normalize_discount,
    normalize_image_url,
    normalize_price,
)
from app.extractors.result import ExtractionResult
from app.extractors.stores.complex import (
    extract_aliexpress,
    extract_amazon,
    extract_asos,
    extract_flipkart,
    extract_foxtrot,
    extract_n11,
    extract_target,
    extract_trendyol,
    extract_zalando,
)
from app.extractors.stores.enrichment import (
    extract_rozetka_html,
    extract_shopgoodwill_html,
)
from app.extractors.stores.embedded import (
    extract_embedded_store,
    supports_embedded_store,
)
from app.extractors.stores.profiles import PROFILES, FieldRule, StoreProfile
from app.models import ProductData


def supported_store_patterns() -> tuple[str, ...]:
    return tuple(pattern for profile in PROFILES for pattern in profile.patterns) + (
        "bandcamp.com",
        "amazon.",
        "aliexpress.",
        "foxtrot.com.ua",
        "n11.com",
        "rozetka.com.ua",
        "shopgoodwill.com",
        "wildberries.ru",
    )


def get_store_profile(page_url: str) -> StoreProfile | None:
    hostname = (urlparse(page_url).hostname or "").lower()
    return next(
        (
            candidate
            for candidate in PROFILES
            if any(pattern in hostname for pattern in candidate.patterns)
        ),
        None,
    )


def extract_store_product(
    html_text: str,
    page_url: str,
) -> ExtractionResult | None:
    hostname = (urlparse(page_url).hostname or "").lower()
    if supports_embedded_store(page_url):
        embedded = extract_embedded_store(html_text, page_url)
        if embedded.product.title or embedded.product.price or embedded.product.image:
            return embedded
    complex_extractors = (
        ("amazon.", extract_amazon),
        ("aliexpress.", extract_aliexpress),
        ("asos.com", extract_asos),
        ("foxtrot.com.ua", extract_foxtrot),
        ("n11.com", extract_n11),
        ("target.com", extract_target),
        ("flipkart.com", extract_flipkart),
        ("trendyol.com", extract_trendyol),
        ("zalando.", extract_zalando),
        ("rozetka.com.ua", extract_rozetka_html),
        ("shopgoodwill.com", extract_shopgoodwill_html),
    )
    for pattern, extractor in complex_extractors:
        if pattern in hostname:
            return extractor(html_text, page_url)
    if "bandcamp.com" in hostname:
        return _extract_bandcamp(html_text, page_url)

    profile = get_store_profile(page_url)
    if profile is None:
        return None
    return _extract_profile(profile, html_text, page_url)


def _extract_profile(
    profile: StoreProfile,
    html_text: str,
    page_url: str,
) -> ExtractionResult:
    document = _parse_document(html_text)
    title = _select(document, profile.title)
    if title:
        for pattern in profile.title_cleanup:
            title = re.sub(pattern, "", title, flags=re.I).strip()
    if title and any(blocked in title.lower() for blocked in profile.blocked_titles):
        return ExtractionResult(warnings=[f"{profile.name}_blocked_page"])

    current_price = normalize_price(_select(document, profile.current_price))
    if not current_price:
        current_price = _first_regex_price(html_text, profile.current_price_regex)

    old_price = normalize_price(_select(document, profile.old_price)) if profile.old_price else None
    if not old_price:
        old_price = _first_regex_price(html_text, profile.old_price_regex)

    if old_price and current_price:
        price, discount_price, has_discount = normalize_discount(old_price, current_price)
    else:
        price, discount_price, has_discount = current_price, None, False

    currency = normalize_currency(_select(document, profile.currency)) if profile.currency else None
    if not currency and profile.currency_regex:
        match = re.search(profile.currency_regex, html_text, re.I)
        currency = normalize_currency(match.group(1)) if match else None
    if not currency and price:
        currency = profile.default_currency

    image = normalize_image_url(_select(document, profile.image), page_url) if profile.image else None
    if image:
        for pattern, replacement in profile.image_replacements:
            image = re.sub(pattern, replacement, image, flags=re.I)

    product = ProductData(
        title=clean_text(title),
        description=clean_text(_select(document, profile.description))
        if profile.description
        else None,
        image=image,
        price=price,
        discount_price=discount_price,
        has_discount=has_discount,
        currency=currency,
    )
    source_name = f"store:{profile.name}"
    sources = {
        field_name: source_name
        for field_name, value in product.model_dump().items()
        if value not in (None, False)
    }
    if has_discount:
        sources["has_discount"] = source_name
    return ExtractionResult(product=product, sources=sources)


def _extract_bandcamp(html_text: str, page_url: str) -> ExtractionResult:
    document = _parse_document(html_text)
    title = None
    description = None
    image = None
    price = None
    currency = None

    for script in document.xpath("//script[@type='application/ld+json']/text()"):
        try:
            payload = json.loads(script)
        except (json.JSONDecodeError, TypeError):
            continue
        if not isinstance(payload, dict) or payload.get("@type") not in {
            "MusicAlbum",
            "MusicRecording",
        }:
            continue
        title = clean_text(payload.get("name"))
        description = clean_text(payload.get("description"))
        if description:
            description = re.sub(r"^PREVIEWS:\s*https?://\S+\s*", "", description, flags=re.I)
        raw_image = payload.get("image")
        if isinstance(raw_image, str):
            image = normalize_image_url(
                re.sub(r"_\d+(\.\w+)$", r"_10\1", raw_image),
                page_url,
            )
        for release in payload.get("albumRelease") or []:
            if not isinstance(release, dict):
                continue
            offers = release.get("offers")
            for offer in offers if isinstance(offers, list) else [offers]:
                if isinstance(offer, dict) and offer.get("price") is not None:
                    price = normalize_price(offer.get("price"))
                    currency = normalize_currency(offer.get("priceCurrency"))
                    break
            if price:
                break
        break

    if not price:
        match = re.search(r'"minimum_price"\s*:\s*([\d.]+)', html_text)
        price = normalize_price(match.group(1)) if match else None

    product = ProductData(
        title=title,
        description=description,
        image=image,
        price=price,
        currency=currency,
    )
    sources = {
        field_name: "store:bandcamp"
        for field_name, value in product.model_dump().items()
        if value not in (None, False)
    }
    return ExtractionResult(product=product, sources=sources)


def _parse_document(html_text: str) -> html.HtmlElement:
    parser = html.HTMLParser(encoding="utf-8", recover=True, huge_tree=False)
    try:
        return html.fromstring(html_text, parser=parser)
    except (etree.ParserError, ValueError):
        return html.fromstring("<html></html>", parser=parser)


def _select(document: html.HtmlElement, rule: FieldRule | None) -> str | None:
    if rule is None:
        return None
    for xpath in rule.xpaths:
        nodes = document.xpath(xpath)
        if not nodes:
            continue
        node = nodes[0]
        if isinstance(node, str):
            value = clean_text(node)
            if value:
                return value
            continue
        for attribute in rule.attributes:
            value = clean_text(node.get(attribute))
            if value:
                return value
        value = clean_text(node.text_content() if hasattr(node, "text_content") else node.text)
        if value:
            return value
    return None


def _first_regex_price(html_text: str, patterns: tuple[str, ...]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, html_text, re.I)
        if match:
            price = normalize_price(match.group(1))
            if price:
                return price
    return None

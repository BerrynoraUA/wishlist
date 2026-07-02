import json
import re
from collections.abc import Iterable
from typing import Any

from lxml import etree, html

from app.extractors.normalization import (
    clean_text,
    normalize_currency,
    normalize_discount,
    normalize_image_url,
    normalize_price,
)
from app.extractors.result import ExtractionResult
from app.models import ProductData


def extract_generic_product(html_text: str, page_url: str) -> ExtractionResult:
    result = ExtractionResult()
    if not html_text.strip():
        result.warnings.append("empty_html")
        return result

    document = _parse_document(html_text)
    result.merge_missing(_extract_json_ld(document, page_url))
    result.merge_missing(_extract_meta_and_dom(document, html_text, page_url))
    result.merge_missing(_extract_regex(html_text, page_url))
    _finalize_product(result)
    return result


def _parse_document(html_text: str) -> html.HtmlElement:
    parser = html.HTMLParser(encoding="utf-8", recover=True, huge_tree=False)
    try:
        return html.fromstring(html_text, parser=parser)
    except (etree.ParserError, ValueError):
        return html.fromstring("<html></html>", parser=parser)


def _extract_json_ld(document: html.HtmlElement, page_url: str) -> ExtractionResult:
    result = ExtractionResult()
    scripts = document.xpath(
        "//script[translate(@type, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', "
        "'abcdefghijklmnopqrstuvwxyz')='application/ld+json']/text()"
    )
    for script in scripts:
        try:
            payload = json.loads(script.strip())
        except (json.JSONDecodeError, TypeError, ValueError):
            result.warnings.append("malformed_json_ld")
            continue

        product = next(_iter_products(payload), None)
        if product is None:
            continue

        parsed = _product_from_json_ld(product, page_url)
        if parsed.product.title or parsed.product.price or parsed.product.image:
            return parsed
    return result


def _iter_products(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, list):
        for item in value:
            yield from _iter_products(item)
        return
    if not isinstance(value, dict):
        return

    raw_type = value.get("@type")
    types = raw_type if isinstance(raw_type, list) else [raw_type]
    normalized_types = {str(item).rsplit("/", 1)[-1].lower() for item in types if item}
    if "product" in normalized_types:
        yield value

    graph = value.get("@graph")
    if graph is not None:
        yield from _iter_products(graph)


def _product_from_json_ld(item: dict[str, Any], page_url: str) -> ExtractionResult:
    title = clean_text(item.get("name"))
    description = clean_text(item.get("description"))
    image = _json_ld_image(item.get("image"), page_url)
    price, discount_price, discount_end_date, currency = _json_ld_offers(item.get("offers"))
    price, discount_price, has_discount = normalize_discount(price, discount_price)

    product = ProductData(
        title=title,
        description=description,
        image=image,
        price=price,
        discount_price=discount_price,
        has_discount=has_discount,
        discount_end_date=clean_text(discount_end_date),
        currency=normalize_currency(currency) or _currency_from_json_ld(item),
    )
    sources = {
        field_name: "json_ld"
        for field_name, value in product.model_dump().items()
        if value not in (None, False)
    }
    if has_discount:
        sources["has_discount"] = "json_ld"
    return ExtractionResult(product=product, sources=sources)


def _json_ld_image(value: Any, page_url: str) -> str | None:
    candidate = value[0] if isinstance(value, list) and value else value
    if isinstance(candidate, dict):
        candidate = candidate.get("url") or candidate.get("contentUrl")
    return normalize_image_url(candidate, page_url)


def _json_ld_offers(offers: Any) -> tuple[Any, Any, Any, Any]:
    offer_list = offers if isinstance(offers, list) else [offers]
    for offer in offer_list:
        if not isinstance(offer, dict):
            continue

        currency = offer.get("priceCurrency")
        valid_until = offer.get("priceValidUntil")
        offer_type = str(offer.get("@type", "")).rsplit("/", 1)[-1]

        if offer_type == "AggregateOffer" and offer.get("lowPrice") is not None:
            low = offer.get("lowPrice")
            high = offer.get("highPrice")
            if high is not None and normalize_price(high) != normalize_price(low):
                return high, low, valid_until, currency
            return low, None, valid_until, currency

        specifications = offer.get("priceSpecification")
        specs = specifications if isinstance(specifications, list) else [specifications]
        regular = None
        sale = None
        for spec in specs:
            if not isinstance(spec, dict):
                continue
            spec_price = spec.get("price", spec.get("value"))
            if spec_price is None:
                continue
            spec_type = str(spec.get("@type") or spec.get("priceType") or "")
            if re.search(r"list|regular|original|retail|msrp|rrp|base|normal", spec_type, re.I):
                regular = spec_price
            elif re.search(r"sale|special|offer|discount|deal|promo|reduced", spec_type, re.I):
                sale = spec_price
            elif sale is None:
                sale = spec_price
            valid_until = valid_until or spec.get("validThrough") or spec.get("priceValidUntil")
            currency = currency or spec.get("priceCurrency")

        if regular is not None or sale is not None:
            return regular or sale, sale if regular and sale else None, valid_until, currency

        base_price = offer.get("price", offer.get("lowPrice"))
        sale_price = offer.get("salePrice")
        high_price = offer.get("highPrice")
        if sale_price is not None and base_price is not None:
            return base_price, sale_price, valid_until, currency
        if high_price is not None and base_price is not None:
            return high_price, base_price, valid_until, currency
        if base_price is not None:
            return base_price, None, valid_until, currency
    return None, None, None, None


def _currency_from_json_ld(item: dict[str, Any]) -> str | None:
    direct = normalize_currency(item.get("priceCurrency"))
    if direct:
        return direct
    offers = item.get("offers")
    offer_list = offers if isinstance(offers, list) else [offers]
    for offer in offer_list:
        if isinstance(offer, dict):
            currency = normalize_currency(offer.get("priceCurrency"))
            if currency:
                return currency
    return None


def _extract_meta_and_dom(
    document: html.HtmlElement,
    html_text: str,
    page_url: str,
) -> ExtractionResult:
    def meta(*names: str) -> str | None:
        for name in names:
            values = document.xpath(
                "//meta[translate(@property, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', "
                "'abcdefghijklmnopqrstuvwxyz')=$name or "
                "translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', "
                "'abcdefghijklmnopqrstuvwxyz')=$name]/@content",
                name=name.lower(),
            )
            if values:
                value = clean_text(values[0])
                if value:
                    return value
        return None

    title = meta("og:title", "twitter:title")
    if not title:
        title = _first_text(
            document,
            [
                "//*[@itemprop='name'][1]",
                "//h1[1]",
                "//title[1]",
            ],
        )

    description = meta("og:description", "twitter:description", "description")
    if not description:
        description = _first_attribute_or_text(
            document,
            ["//*[@itemprop='description'][1]"],
            "content",
        )

    image = normalize_image_url(
        meta("og:image", "og:image:url", "twitter:image", "twitter:image:src")
        or _first_attribute(
            document,
            [
                "//*[@itemprop='image'][1]",
                "//img[contains(@class, 'product')][1]",
            ],
            ("content", "src", "data-src"),
        ),
        page_url,
    )

    current_price = meta("product:price:amount", "og:price:amount")
    if not current_price:
        current_price = _first_attribute_or_text(
            document,
            [
                "//*[@itemprop='price'][1]",
                "//*[@data-price][1]",
                "//*[contains(@class, 'sale-price')][1]",
                "//*[contains(@class, 'current-price')][1]",
                "//*[contains(@class, 'product-price')][1]",
            ],
            "content",
            "data-price",
        )

    original_price = _first_attribute_or_text(
        document,
        [
            "//*[contains(@class, 'old-price')][1]",
            "//*[contains(@class, 'original-price')][1]",
            "//*[contains(@class, 'list-price')][1]",
            "//del[1]",
            "//s[1]",
        ],
        "content",
        "data-price",
    )

    current_price = normalize_price(current_price)
    original_price = normalize_price(original_price)
    if original_price and current_price:
        price, discount_price, has_discount = normalize_discount(original_price, current_price)
    else:
        price, discount_price, has_discount = current_price, None, False

    currency = normalize_currency(
        meta("product:price:currency", "og:price:currency")
        or _first_attribute_or_text(
            document,
            ["//*[@itemprop='priceCurrency'][1]"],
            "content",
        )
        or _currency_from_text(html_text)
    )

    product = ProductData(
        title=title,
        description=description,
        image=image,
        price=price,
        discount_price=discount_price,
        has_discount=has_discount,
        currency=currency,
    )
    sources: dict[str, str] = {}
    for field_name, value in product.model_dump().items():
        if value not in (None, False):
            sources[field_name] = "meta_dom"
    if has_discount:
        sources["has_discount"] = "meta_dom"
    return ExtractionResult(product=product, sources=sources)


def _extract_regex(html_text: str, page_url: str) -> ExtractionResult:
    def meta_content(name: str) -> str | None:
        escaped = re.escape(name)
        patterns = [
            rf'<meta[^>]+(?:property|name)=["\']{escaped}["\'][^>]+content=["\']([^"\']+)',
            rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{escaped}["\']',
        ]
        for pattern in patterns:
            match = re.search(pattern, html_text, re.I)
            if match:
                return clean_text(match.group(1))
        return None

    title = meta_content("og:title")
    if not title:
        match = re.search(r"<h1[^>]*>(.*?)</h1>", html_text, re.I | re.S)
        title = clean_text(re.sub(r"<[^>]+>", " ", match.group(1))) if match else None

    description = meta_content("og:description") or meta_content("description")
    image = normalize_image_url(meta_content("og:image"), page_url)
    raw_price = meta_content("product:price:amount") or meta_content("og:price:amount")
    # A bare number near the word "price" is common in analytics, login and
    # challenge pages. Only use the broad regex after the page has established
    # a product identity with both a product title and image.
    if not raw_price and title and image:
        match = re.search(
            r"(?:price|amount)[^\d]{0,20}(\d[\d\s.,]{0,20})",
            html_text,
            re.I,
        )
        raw_price = match.group(1) if match else None
    price = normalize_price(raw_price)
    currency = normalize_currency(
        meta_content("product:price:currency")
        or meta_content("og:price:currency")
        or _currency_from_text(html_text)
    )

    product = ProductData(
        title=title,
        description=description,
        image=image,
        price=price,
        currency=currency,
    )
    sources = {
        field_name: "regex"
        for field_name, value in product.model_dump().items()
        if value not in (None, False)
    }
    return ExtractionResult(product=product, sources=sources)


def _first_text(document: html.HtmlElement, xpaths: list[str]) -> str | None:
    for xpath in xpaths:
        values = document.xpath(xpath)
        if values:
            node = values[0]
            value = clean_text(node.text_content() if hasattr(node, "text_content") else node)
            if value:
                return value
    return None


def _first_attribute(
    document: html.HtmlElement,
    xpaths: list[str],
    attributes: tuple[str, ...],
) -> str | None:
    for xpath in xpaths:
        nodes = document.xpath(xpath)
        if not nodes:
            continue
        node = nodes[0]
        for attribute in attributes:
            value = clean_text(node.get(attribute))
            if value:
                return value
    return None


def _first_attribute_or_text(
    document: html.HtmlElement,
    xpaths: list[str],
    *attributes: str,
) -> str | None:
    attribute_value = _first_attribute(document, xpaths, tuple(attributes))
    return attribute_value or _first_text(document, xpaths)


def _currency_from_text(text: str) -> str | None:
    patterns = [
        (r"(?:\bUAH\b|₴|грн\.?)", "UAH"),
        (r"(?:\bUSD\b|US\$|\$)", "USD"),
        (r"(?:\bEUR\b|€)", "EUR"),
        (r"(?:\bGBP\b|£)", "GBP"),
        (r"(?:\bTRY\b|₺|\bTL\b)", "TRY"),
        (r"(?:\bPLN\b|zł)", "PLN"),
        (r"(?:\bINR\b|₹)", "INR"),
    ]
    for pattern, currency in patterns:
        if re.search(pattern, text, re.I):
            return currency
    return None


def _finalize_product(result: ExtractionResult) -> None:
    product = result.product
    product.title = clean_text(product.title)
    product.description = clean_text(product.description)
    product.currency = normalize_currency(product.currency)
    product.image = normalize_image_url(product.image, "")
    product.price, product.discount_price, product.has_discount = normalize_discount(
        product.price,
        product.discount_price,
    )
    if product.has_discount:
        result.sources.setdefault("has_discount", "derived")
    else:
        product.discount_end_date = None
        result.sources.pop("discount_end_date", None)
    if product.discount_price is None:
        result.sources.pop("discount_price", None)

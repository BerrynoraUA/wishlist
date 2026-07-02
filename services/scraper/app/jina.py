import re
from urllib.parse import urlparse

from app.extractors.normalization import normalize_currency, normalize_image_url, normalize_price
from app.extractors.result import ExtractionResult
from app.models import ProductData


def reader_url(product_url: str) -> str:
    return f"https://r.jina.ai/{product_url}"


def parse_reader_markdown(markdown: str, product_url: str) -> ExtractionResult:
    # Reader is only trusted if the response still refers to the requested
    # product identity. This prevents a homepage/login response being accepted.
    identifiers = _identifiers(product_url)
    lowered = markdown.lower()
    if identifiers and not any(identifier in lowered for identifier in identifiers):
        return ExtractionResult(warnings=["jina_product_identity_mismatch"])

    title_match = re.search(r"^Title:\s*(.+)$", markdown, re.M)
    if not title_match:
        title_match = re.search(r"^#\s+(.+)$", markdown, re.M)
    title = title_match.group(1).strip() if title_match else None
    image_match = re.search(r"!\[[^\]]*]\((https?://[^)\s]+)", markdown)
    price_match = re.search(
        r"(?:USD|EUR|GBP|RON|RUB|THB|INR|ZAR|US\$|[$€£₹₽])\s*([\d][\d\s,.]*)"
        r"|([\d][\d\s,.]*)\s*(?:USD|EUR|GBP|RON|RUB|THB|INR|ZAR|Lei|руб)",
        markdown,
        re.I,
    )
    raw_price = next((group for group in price_match.groups() if group), None) if price_match else None
    currency_match = re.search(
        r"\b(USD|EUR|GBP|RON|RUB|THB|INR|ZAR)\b|([$€£₹₽])",
        markdown,
        re.I,
    )
    currency = normalize_currency(currency_match.group(0)) if currency_match else None
    product = ProductData(
        title=title,
        image=normalize_image_url(image_match.group(1), product_url) if image_match else None,
        price=normalize_price(raw_price),
        currency=currency,
    )
    sources = {
        field: "jina_reader"
        for field, value in product.model_dump().items()
        if value not in (None, False)
    }
    return ExtractionResult(product=product, sources=sources)


def _identifiers(product_url: str) -> set[str]:
    path = urlparse(product_url).path.lower()
    candidates = re.findall(r"[a-z0-9]{5,}", path)
    return {value for value in candidates if any(character.isdigit() for character in value)}

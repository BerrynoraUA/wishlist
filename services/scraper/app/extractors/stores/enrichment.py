import json
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from urllib.parse import urljoin, urlparse

from lxml import etree, html

from app.extractors.normalization import (
    clean_text,
    normalize_discount,
    normalize_image_url,
    normalize_price,
)
from app.extractors.result import ExtractionResult
from app.models import ProductData


class EnrichmentKind(StrEnum):
    LELEKAN_PROMOTION = "lelekan_promotion"
    SHOPGOODWILL_ITEM = "shopgoodwill_item"
    WILDBERRIES_CARD = "wildberries_card"
    TARGET_PRODUCT = "target_product"


@dataclass(frozen=True, slots=True)
class EnrichmentRequest:
    kind: EnrichmentKind
    url: str
    headers: dict[str, str] = field(default_factory=dict)


def build_enrichment_request(
    page_url: str,
    html_text: str,
) -> EnrichmentRequest | None:
    hostname = (urlparse(page_url).hostname or "").lower()
    if "lelekan.com.ua" in hostname:
        match = re.search(
            r"\.load\(\s*[\"']([^\"']*product_promotion[^\"']*)[\"']\s*\)",
            html_text,
            re.I,
        )
        if not match:
            return None
        promotion_url = urljoin(page_url, match.group(1).replace("&amp;", "&"))
        return EnrichmentRequest(
            kind=EnrichmentKind.LELEKAN_PROMOTION,
            url=promotion_url,
            headers={"Referer": page_url},
        )

    if "shopgoodwill.com" in hostname:
        match = re.search(r"/item/(\d+)", urlparse(page_url).path, re.I)
        if not match:
            return None
        return EnrichmentRequest(
            kind=EnrichmentKind.SHOPGOODWILL_ITEM,
            url=(
                "https://buyerapi.shopgoodwill.com/api/"
                f"ItemDetail/GetItemDetailModelByItemId/{match.group(1)}"
            ),
        )

    if "wildberries.ru" in hostname:
        match = re.search(r"/catalog/(\d+)/", urlparse(page_url).path)
        if not match:
            return None
        article_id = int(match.group(1))
        return EnrichmentRequest(
            kind=EnrichmentKind.WILDBERRIES_CARD,
            url=(
                "https://card.wb.ru/cards/v2/detail"
                "?appType=1&curr=rub&dest=-1257786&lang=ru&spp=30"
                f"&nm={article_id}"
            ),
        )
    if "target.com" in hostname:
        selected = re.search(r"(?:[?&])preselect=(\d+)", page_url)
        fallback = re.search(r"/A-(\d+)", urlparse(page_url).path)
        tcin = (selected or fallback)
        key = re.search(r'apiKey(?:\\?")?\s*:\\?"([a-f0-9]{32,})', html_text, re.I)
        if not tcin or not key:
            return None
        return EnrichmentRequest(
            kind=EnrichmentKind.TARGET_PRODUCT,
            url=(
                "https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1"
                f"?key={key.group(1)}&tcin={tcin.group(1)}"
                "&store_id=3991&pricing_store_id=3991&has_pricing_store_id=true"
            ),
            headers={"Referer": page_url},
        )
    return None


def parse_enrichment_response(
    request: EnrichmentRequest,
    body: str,
    base: ExtractionResult | None = None,
    *,
    now: datetime | None = None,
) -> ExtractionResult:
    if request.kind == EnrichmentKind.LELEKAN_PROMOTION:
        return _parse_lelekan_promotion(body, base or ExtractionResult(), now=now)
    if request.kind == EnrichmentKind.SHOPGOODWILL_ITEM:
        return _parse_shopgoodwill_api(body)
    if request.kind == EnrichmentKind.WILDBERRIES_CARD:
        return _parse_wildberries_card(body, request.url)
    if request.kind == EnrichmentKind.TARGET_PRODUCT:
        return _parse_target_product(body, request.url)
    return base or ExtractionResult()


def extract_rozetka_html(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    current = _price(
        document,
        (
            "//*[contains(@class,'product-price__big')][1]",
            "//*[@data-testid='price'][1]",
            "//*[@itemprop='price'][1]",
        ),
    )
    old = _price(
        document,
        (
            "//*[contains(@class,'product-price__small')][1]",
            "//*[contains(@class,'old-price')][1]",
            "//*[contains(@class,'price--old')][1]",
        ),
    )
    if old and current:
        price, discount, has_discount = normalize_discount(old, current)
    else:
        price, discount, has_discount = current, None, False

    product = ProductData(
        title=_text(
            document,
            ("//h1[contains(@class,'product__title')][1]", "//h1[1]"),
        ),
        description=_attribute(
            document,
            ("//meta[@property='og:description']", "//meta[@name='description']"),
            "content",
        ),
        image=normalize_image_url(
            _attribute(document, ("//meta[@property='og:image']",), "content"),
            page_url,
        ),
        price=price,
        discount_price=discount,
        has_discount=has_discount,
        currency="UAH" if price else None,
    )
    return _sourced(product, "rozetka")


def extract_shopgoodwill_html(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    title = _attribute(document, ("//meta[@property='og:title']",), "content") or _text(
        document,
        ("//title", "//h1[1]"),
    )
    if title:
        title = re.sub(r"^(?:Used|New|Like New|Pre-Owned)\s+", "", title, flags=re.I)
    price = None
    for pattern in (
        r'"currentPrice"\s*:\s*([\d.]+)',
        r'"minimumBid"\s*:\s*([\d.]+)',
        r'"startingBid"\s*:\s*([\d.]+)',
        r'"buyNowPrice"\s*:\s*([\d.]+)',
    ):
        match = re.search(pattern, html_text, re.I)
        if match:
            price = normalize_price(match.group(1))
            if price:
                break
    product = ProductData(
        title=clean_text(title),
        description=_attribute(
            document,
            ("//meta[@property='og:description']", "//meta[@name='description']"),
            "content",
        ),
        image=normalize_image_url(
            (_attribute(document, ("//meta[@property='og:image']",), "content") or "").replace(
                "\\",
                "/",
            ),
            page_url,
        ),
        price=price,
        currency="USD" if price else None,
    )
    return _sourced(product, "shopgoodwill_html")


def wildberries_base_path(article_id: int) -> str:
    vol = article_id // 100_000
    part = article_id // 1_000
    basket = _wildberries_basket(vol)
    return (
        f"https://basket-{basket:02d}.wbbasket.ru/"
        f"vol{vol}/part{part}/{article_id}"
    )


def _parse_lelekan_promotion(
    body: str,
    base: ExtractionResult,
    *,
    now: datetime | None,
) -> ExtractionResult:
    match = re.search(
        r"new\s+Date\(\s*[\"'](\d{4}-\d{2}-\d{2})[\"']\s*\)",
        body,
    )
    if not match or not base.product.has_discount:
        return base
    end_date = match.group(1)
    current_time = now or datetime.now(UTC)
    expiry = datetime.fromisoformat(end_date).replace(tzinfo=UTC)
    if expiry <= current_time:
        base.product.price = base.product.discount_price or base.product.price
        base.product.discount_price = None
        base.product.has_discount = False
        base.product.discount_end_date = None
        base.sources.pop("discount_price", None)
        base.sources.pop("has_discount", None)
        return base

    base.product.discount_end_date = end_date
    base.sources["discount_end_date"] = "api:lelekan_promotion"
    return base


def _parse_shopgoodwill_api(body: str) -> ExtractionResult:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return ExtractionResult(warnings=["shopgoodwill_invalid_json"])
    if not isinstance(data, dict) or not data.get("title"):
        return ExtractionResult(warnings=["shopgoodwill_missing_title"])

    title = re.sub(
        r"^(?:Used|New|Like New|Pre-Owned)\s+",
        "",
        str(data.get("title", "")).strip(),
        flags=re.I,
    )
    image = None
    if data.get("imageUrlString") and data.get("imageServer"):
        first_image = str(data["imageUrlString"]).split(";", 1)[0]
        image = normalize_image_url(
            (str(data["imageServer"]) + first_image).replace("\\", "/"),
            "https://shopgoodwill.com",
        )

    description = None
    if data.get("description"):
        description = clean_text(_document(str(data["description"])).text_content())
    price = normalize_price(data.get("currentPrice") or data.get("startingPrice"))
    return _sourced(
        ProductData(
            title=clean_text(title),
            description=description,
            image=image,
            price=price,
            currency="USD" if price else None,
        ),
        "shopgoodwill_api",
        prefix="api",
    )


def _parse_wildberries_card(body: str, request_url: str) -> ExtractionResult:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return ExtractionResult(warnings=["wildberries_invalid_json"])
    if not isinstance(data, dict):
        return ExtractionResult(warnings=["wildberries_invalid_payload"])

    products = data.get("data", {}).get("products", []) if isinstance(data.get("data"), dict) else []
    if products and isinstance(products[0], dict):
        product_data = products[0]
        article_id = int(product_data.get("id") or 0)
        name = clean_text(product_data.get("name"))
        brand = clean_text(product_data.get("brand"))
        title = f"{name} {brand}" if name and brand else name
        image = (
            f"{wildberries_base_path(article_id)}/images/c246x328/1.webp"
            if article_id
            else None
        )
        price_pairs: list[tuple[str, str]] = []
        for size in product_data.get("sizes") or []:
            if not isinstance(size, dict):
                continue
            price_data = size.get("price") if isinstance(size.get("price"), dict) else {}
            basic = normalize_price(str(price_data.get("basic", "")))
            current = normalize_price(
                str(price_data.get("product") or price_data.get("total") or "")
            )
            if basic and current:
                price_pairs.append(
                    (
                        normalize_price(str(float(basic) / 100)) or basic,
                        normalize_price(str(float(current) / 100)) or current,
                    )
                )
        if price_pairs:
            regular, current = min(price_pairs, key=lambda pair: float(pair[1]))
            price, discount, has_discount = normalize_discount(regular, current)
        else:
            regular_raw = product_data.get("priceU")
            current_raw = product_data.get("salePriceU")
            regular = normalize_price(str(float(regular_raw) / 100)) if regular_raw else None
            current = normalize_price(str(float(current_raw) / 100)) if current_raw else None
            price, discount, has_discount = normalize_discount(regular, current)
        return _sourced(
            ProductData(
                title=title,
                image=image,
                price=price,
                discount_price=discount,
                has_discount=has_discount,
                currency="RUB" if price else None,
            ),
            "wildberries_card",
            prefix="api",
        )

    name = clean_text(data.get("imt_name"))
    selling = data.get("selling") if isinstance(data.get("selling"), dict) else {}
    brand = clean_text(selling.get("brand_name"))
    title = f"{name} {brand}" if name and brand else name

    card_suffix = "/info/ru/card.json"
    base_path = request_url[: -len(card_suffix)] if request_url.endswith(card_suffix) else request_url
    media = data.get("media") if isinstance(data.get("media"), dict) else {}
    image = (
        f"{base_path}/images/c246x328/1.webp"
        if int(media.get("photo_count") or 0) > 0
        else None
    )

    wanted_options = ("Состав", "Пол", "Сезон")
    option_values: dict[str, str] = {}
    for option in data.get("options") or []:
        if not isinstance(option, dict) or option.get("name") not in wanted_options:
            continue
        option_values[str(option["name"])] = str(option.get("value", ""))
    parts = [
        f"{name}: {option_values[name]}"
        for name in wanted_options
        if option_values.get(name)
    ]
    description = ". ".join(parts) + "." if parts else None
    return _sourced(
        ProductData(title=title, description=description, image=image),
        "wildberries_card",
        prefix="api",
    )


def _parse_target_product(body: str, request_url: str) -> ExtractionResult:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return ExtractionResult(warnings=["target_invalid_json"])
    match = re.search(r"[?&]tcin=(\d+)", request_url)
    selected_tcin = match.group(1) if match else None

    def find_product(value: object) -> dict[str, object] | None:
        if isinstance(value, dict):
            if str(value.get("tcin")) == selected_tcin and isinstance(value.get("price"), dict):
                return value
            for child in value.values():
                found = find_product(child)
                if found:
                    return found
        elif isinstance(value, list):
            for child in value:
                found = find_product(child)
                if found:
                    return found
        return None

    product = find_product(data)
    if not product:
        return ExtractionResult(warnings=["target_selected_tcin_missing"])
    price_data = product.get("price") if isinstance(product.get("price"), dict) else {}
    current = normalize_price(price_data.get("current_retail"))
    regular = normalize_price(price_data.get("reg_retail"))
    if current and regular:
        price, discount, has_discount = normalize_discount(regular, current)
    else:
        price, discount, has_discount = current, None, False
    item = product.get("item") if isinstance(product.get("item"), dict) else {}
    enrichment = item.get("enrichment") if isinstance(item.get("enrichment"), dict) else {}
    image_info = (
        enrichment.get("image_info")
        if isinstance(enrichment.get("image_info"), dict)
        else {}
    )
    primary_image = (
        image_info.get("primary_image")
        if isinstance(image_info.get("primary_image"), dict)
        else {}
    )
    return _sourced(
        ProductData(
            image=normalize_image_url(primary_image.get("url"), request_url),
            price=price,
            discount_price=discount,
            has_discount=has_discount,
            currency="USD" if price else None,
        ),
        "target_product",
        prefix="api",
    )


def _wildberries_basket(vol: int) -> int:
    thresholds = (
        143,
        287,
        431,
        719,
        1007,
        1061,
        1115,
        1169,
        1313,
        1601,
        1655,
        1919,
        2045,
        2189,
        2405,
        2621,
        2837,
        3053,
        3269,
        3485,
        3701,
        3917,
        4133,
    )
    for basket, maximum in enumerate(thresholds, start=1):
        if vol <= maximum:
            return basket
    return 24


def _sourced(
    product: ProductData,
    source_name: str,
    *,
    prefix: str = "store",
) -> ExtractionResult:
    source = f"{prefix}:{source_name}"
    sources = {
        field_name: source
        for field_name, value in product.model_dump().items()
        if value not in (None, False)
    }
    if product.has_discount:
        sources["has_discount"] = source
    return ExtractionResult(product=product, sources=sources)


def _document(html_text: str) -> html.HtmlElement:
    parser = html.HTMLParser(encoding="utf-8", recover=True, huge_tree=False)
    try:
        return html.fromstring(html_text, parser=parser)
    except (etree.ParserError, ValueError):
        return html.fromstring("<html></html>", parser=parser)


def _text(document: html.HtmlElement, xpaths: tuple[str, ...]) -> str | None:
    for xpath in xpaths:
        nodes = document.xpath(xpath)
        if nodes:
            value = clean_text(nodes[0].text_content())
            if value:
                return value
    return None


def _attribute(
    document: html.HtmlElement,
    xpaths: tuple[str, ...],
    attribute: str,
) -> str | None:
    for xpath in xpaths:
        nodes = document.xpath(xpath)
        if nodes:
            value = clean_text(nodes[0].get(attribute))
            if value:
                return value
    return None


def _price(document: html.HtmlElement, xpaths: tuple[str, ...]) -> str | None:
    for xpath in xpaths:
        nodes = document.xpath(xpath)
        if not nodes:
            continue
        node = nodes[0]
        price = normalize_price(
            node.get("content") or node.get("value") or node.text_content()
        )
        if price:
            return price
    return None

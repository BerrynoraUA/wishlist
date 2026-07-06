import json
import re
from collections.abc import Iterable
from urllib.parse import parse_qs, unquote, urlparse

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


def extract_amazon(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    current = _price_from_xpaths(
        document,
        (
            "//*[@id='corePrice_feature_div']//*[contains(@class,'a-price') and "
            "not(@data-a-strike='true')]//*[contains(@class,'a-offscreen')][1]",
            "//*[@id='corePrice_feature_div']//*[contains(@class,'apex-pricetopay-value')]"
            "//*[@aria-hidden='true'][1]",
            "//*[@id='corePriceDisplay_desktop_feature_div']"
            "//*[contains(@class,'a-offscreen')][1]",
            "//*[contains(@class,'priceToPay')]//*[contains(@class,'a-offscreen')][1]",
            "//*[@id='price_inside_buybox']",
            "//*[@id='priceblock_dealprice']",
            "//*[@id='priceblock_ourprice']",
            "//*[@id='priceblock_saleprice']",
        ),
    )
    old = _price_from_xpaths(
        document,
        (
            "//*[@id='corePrice_feature_div']//*[@data-a-strike='true']"
            "//*[contains(@class,'a-offscreen')][1]",
            "//*[@id='basisPrice']//*[contains(@class,'a-offscreen')][1]",
            "//*[contains(@class,'a-text-price')]//*[contains(@class,'a-offscreen')][1]",
            "//*[contains(@class,'priceBlockStrikePriceString')][1]",
        ),
    )
    if not current:
        current = _regex_price(
            html_text,
            (
                r'"priceAmount"\s*:\s*"?([\d,.]+)"?',
                r'"lowPrice"\s*:\s*"?([\d,.]+)"?',
                r'"price"\s*:\s*"?([\d,.]+)"?',
            ),
        )
    if not current:
        selected_variant_price = _amazon_selected_variant_price(document)
        if selected_variant_price:
            current, variant_currency = selected_variant_price
        else:
            variant_currency = None
    else:
        variant_currency = None

    title = _text(
        document,
        (
            "//*[@id='productTitle']",
            "//h1[contains(@class,'product-title-word-break')]",
            "//h1[@id='title']",
            "//meta[@property='og:title']",
            "//title",
        ),
    )
    if title:
        title = re.sub(r"^Amazon\.[^:]+:\s*", "", title, flags=re.I)
        title = re.sub(
            r"\s*:\s*(?:Electronics|Computers & Accessories|Amazon\.[^ ]+).*$",
            "",
            title,
            flags=re.I,
        )
        title = re.split(
            r"\s*(?:About this item|Technical Details|Additional Information|"
            r"Warranty & Support|From the manufacturer|Product Description)",
            title,
            maxsplit=1,
        )[0].strip()
        if re.fullmatch(r"Amazon\.[a-z.]+", title, re.I):
            title = None

    raw_image = _attribute(
        document,
        ("//*[@id='landingImage']", "//*[@id='imgBlkFront']", "//*[@id='ebooksImgBlkFront']"),
        ("data-old-hires", "src"),
    ) or _attribute(document, ("//meta[@property='og:image']",), ("content",))
    image = normalize_image_url(raw_image, page_url)
    if image:
        image = re.sub(r"\._[A-Z]{2}[^.]*_\.", "._AC_SL1500_.", image)

    description = _text(
        document,
        ("//*[@id='feature-bullets']//ul", "//*[@id='productDescription']//p[1]"),
    )
    price_region_text = _text(
        document,
        (
            "//*[@id='corePrice_feature_div']",
            "//*[@id='corePriceDisplay_desktop_feature_div']",
        ),
    )
    currency = variant_currency or _currency_from_text(
        price_region_text or html_text[:100_000]
    )
    return _result(
        "amazon",
        title,
        description,
        image,
        old,
        current,
        currency,
    )


def _amazon_selected_variant_price(
    document: html.HtmlElement,
) -> tuple[str, str | None] | None:
    selected = document.xpath(
        "//li[@data-initiallyselected='true' or "
        ".//input[@role='radio' and @aria-checked='true']]"
        "//*[contains(concat(' ', normalize-space(@class), ' '), "
        "' inline-twister-swatch-price ')]"
    )
    for node in selected:
        text = clean_text(node.text_content())
        if not text:
            continue
        match = re.search(
            r"(?:\bfrom\b|[$€£])\s*(?:US\s*)?([$€£])?\s*([\d][\d,.]*)",
            text,
            re.I,
        )
        if not match:
            continue
        price = normalize_price(match.group(2))
        if price:
            return price, _currency_from_text(text)
    return None


def extract_aliexpress(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    script_data = _aliexpress_script_data(html_text)

    title = _text(
        document,
        (
            "//*[contains(@class,'title--')]//*[contains(@class,'rc-title-content')][1]",
            "//*[contains(@class,'components--title')][1]",
            "//h1[@data-pl='product-title']",
            "//h1[contains(@class,'product-title-text')]",
            "//h1[1]",
            "//meta[@property='og:title']",
        ),
    ) or clean_text(script_data.get("title"))
    if title:
        title = re.sub(r"\s*[-–|]\s*AliExpress.*$", "", title, flags=re.I).strip()
        if title.lower() in {"aliexpress", "aliexpress.com"}:
            title = None

    image = normalize_image_url(
        clean_text(script_data.get("image"))
        or _attribute(document, ("//meta[@property='og:image']",), ("content",))
        or _attribute(
            document,
            (
                "//*[contains(@class,'image-view-magnifier-wrap')]//img[1]",
                "//img[contains(@class,'magnifier-image')][1]",
            ),
            ("src", "data-src"),
        ),
        page_url,
    )
    description = _attribute(
        document,
        ("//meta[@property='og:description']", "//meta[@name='description']"),
        ("content",),
    ) or clean_text(script_data.get("description"))
    if description and re.match(r"^Smarter Shopping", description, re.I):
        description = None

    current = (
        _price_from_xpaths(
            document,
            (
                "//*[contains(@class,'price-default--current')][1]",
                "//*[contains(@class,'price--current')][1]",
                "//*[contains(@class,'snow-price')]//*[contains(@class,'current')][1]",
                "//*[contains(@class,'product-price-current')][1]",
                "//meta[@property='product:price:amount']",
            ),
        )
        or normalize_price(script_data.get("current_price"))
    )
    old = (
        _price_from_xpaths(
            document,
            (
                "//*[contains(@class,'price-default--original')][1]",
                "//*[contains(@class,'price--original')][1]",
                "//*[contains(@class,'price--del')][1]",
                "//*[contains(@class,'product-price-original')][1]",
            ),
        )
        or normalize_price(script_data.get("old_price"))
    )
    if not current:
        tracked_prices = _aliexpress_tracking_prices(page_url)
        if tracked_prices:
            old, current, tracked_currency = tracked_prices
        else:
            tracked_currency = None
    else:
        tracked_currency = None
    currency = tracked_currency or normalize_currency(
        _attribute(
            document,
            ("//meta[@property='product:price:currency']",),
            ("content",),
        )
    ) or _currency_from_text(html_text[:100_000])
    return _result(
        "aliexpress",
        title,
        description,
        image,
        old,
        current,
        currency,
    )


def extract_asos(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    title = _text(document, ("//meta[@property='og:title']", "//h1[1]", "//title"))
    description = _text(
        document,
        ("//meta[@property='og:description']", "//meta[@name='description']"),
    )
    image = normalize_image_url(
        _attribute(document, ("//meta[@property='og:image']",), ("content",)),
        page_url,
    )

    product_id_match = re.search(r"/prd/(\d+)", page_url, re.I)
    response_match = re.search(
        r"window\.asos\.pdp\.config\.stockPriceResponse\s*=\s*'(\[.*?\])'\s*;",
        html_text,
        re.S,
    )
    old_price = None
    current_price = None
    currency = None
    if product_id_match and response_match:
        try:
            prices = json.loads(response_match.group(1))
        except (json.JSONDecodeError, TypeError):
            prices = []
        product_id = int(product_id_match.group(1))
        price_entry = next(
            (
                entry
                for entry in prices
                if isinstance(entry, dict) and entry.get("productId") == product_id
            ),
            None,
        )
        product_price = price_entry.get("productPrice") if price_entry else None
        if isinstance(product_price, dict):
            current = product_price.get("current")
            previous = product_price.get("previous")
            current_price = normalize_price(
                current.get("value") if isinstance(current, dict) else None
            )
            old_price = normalize_price(
                previous.get("value") if isinstance(previous, dict) else None
            )
            currency = normalize_currency(product_price.get("currency"))

    return _result(
        "asos",
        title,
        description,
        image,
        old_price,
        current_price,
        currency,
    )


def extract_target(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    selected = re.search(r"(?:[?&])preselect=(\d+)", page_url)
    selected_tcin = selected.group(1) if selected else None
    title = _attribute(document, ("//meta[@property='og:title']",), ("content",))
    description = _attribute(
        document,
        ("//meta[@property='og:description']", "//meta[@name='description']"),
        ("content",),
    )
    image = normalize_image_url(
        _attribute(document, ("//meta[@property='og:image']",), ("content",)),
        page_url,
    )

    scoped_text = ""
    if selected_tcin:
        scoped_text = "\n".join(
            html_text[max(0, match.start() - 8_000) : match.start() + 8_000]
            for match in re.finditer(re.escape(selected_tcin), html_text)
        )
    current = _price_from_xpaths(
        document,
        (
            "//*[@data-test='product-price'][1]",
            "//*[@data-test='product-price-primary'][1]",
            "//*[@itemprop='price'][1]",
        ),
    ) or _regex_price(
        scoped_text,
        (
            r'"current_retail(?:_min)?"\s*:\s*([\d.]+)',
            r'"formatted_current_price"\s*:\s*"\$?([\d,.]+)',
        ),
    )
    regular = _price_from_xpaths(
        document,
        (
            "//*[@data-test='product-regular-price'][1]",
            "//*[contains(@class,'strikethrough')][1]",
        ),
    ) or _regex_price(
        scoped_text,
        (
            r'"reg_retail(?:_max)?"\s*:\s*([\d.]+)',
            r'"formatted_comparison_price"\s*:\s*"\$?([\d,.]+)',
        ),
    )
    result = _result(
        "target",
        title,
        description,
        image,
        regular,
        current,
        "USD" if current else None,
    )
    if not result.product.price:
        result.warnings.extend(
            ("do_not_merge:price", "do_not_merge:discount_price", "do_not_merge:currency")
        )
    return result


def extract_flipkart(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    title = _attribute(document, ("//meta[@property='og:title']",), ("content",))
    if title:
        title = re.sub(r"\s*-\s*Buy\s.*$", "", title, flags=re.I).strip()
    description = _attribute(
        document,
        (
            "//meta[@property='og:description']",
            "//meta[@name='description']",
            "//meta[@name='Description']",
        ),
        ("content",),
    )
    image = normalize_image_url(
        _attribute(document, ("//meta[@property='og:image']",), ("content",)),
        page_url,
    )
    if image:
        image = re.sub(r"/image/\d+/\d+/", "/image/1500/1500/", image)
    price = _regex_price(
        description or "",
        (r"\bat\s+Rs\.\s*([\d,]+(?:\.\d+)?)\s+at\s+Flipkart\.com",),
    )
    result = _result(
        "flipkart",
        title,
        description,
        image,
        None,
        price,
        "INR" if price else None,
    )
    if not result.product.price:
        result.warnings.extend(("do_not_merge:price", "do_not_merge:currency"))
    return result


def extract_trendyol(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    title = _attribute(document, ("//meta[@property='og:title']",), ("content",))
    if title:
        title = re.sub(r"\s*[–—-]\s*(?:.*?\s+)?Trendyol.*$", "", title, flags=re.I).strip()
    description = _attribute(
        document,
        ("//meta[@property='og:description']", "//meta[@name='description']"),
        ("content",),
    )
    image = normalize_image_url(
        _attribute(document, ("//meta[@property='og:image']",), ("content",)),
        page_url,
    )
    current = _regex_price(
        html_text,
        (
            r'"product_discounted_price"\s*:\s*([\d.]+)',
            r'"product_price"\s*:\s*([\d.]+)',
        ),
    )
    regular = _regex_price(
        html_text,
        (r'"product_original_price"\s*:\s*([\d.]+)',),
    )
    locale = urlparse(page_url).path.split("/")[1].lower()
    locale_currencies = {
        "uk": "UAH",
        "ro": "RON",
        "el": "EUR",
        "de": "EUR",
        "en": "AED",
    }
    currency = locale_currencies.get(locale)
    if not currency:
        match = re.search(r'"currency"\s*:\s*"([A-Z]{3})"', html_text)
        currency = normalize_currency(match.group(1)) if match else "TRY"
    result = _result(
        "trendyol",
        title,
        description,
        image,
        regular,
        current,
        currency if current else None,
    )
    if not result.product.price:
        result.warnings.extend(("do_not_merge:price", "do_not_merge:currency"))
    return result


def extract_zalando(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    title = _attribute(document, ("//meta[@property='og:title']",), ("content",))
    if title:
        title = re.sub(r"\s*-\s*Zalando\.[a-z.]+\s*$", "", title, flags=re.I).strip()
    description = _attribute(
        document,
        ("//meta[@property='og:description']", "//meta[@name='description']"),
        ("content",),
    )
    image = normalize_image_url(
        _attribute(document, ("//meta[@property='og:image']",), ("content",)),
        page_url,
    )
    price = _price_from_xpaths(
        document,
        (
            "//*[@itemprop='price'][1]",
            "//meta[@property='product:price:amount'][1]",
        ),
    ) or _regex_price(
        description or "",
        (r"\bpre\s+([\d,.]+)\s*(?:€|EUR)",),
    )
    result = _result(
        "zalando",
        title,
        description,
        image,
        None,
        price,
        "EUR" if price else None,
    )
    if not result.product.price:
        result.warnings.extend(("do_not_merge:price", "do_not_merge:currency"))
    return result


def extract_foxtrot(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    current = _price_from_xpaths(
        document,
        (
            "//*[@data-product-price-main]//data[1]",
            "//*[@data-product-price-main]//*[self::span or self::data][1]",
            "//*[@data-product-price-main]",
            "//*[contains(@class,'product-box__main_price')][1]",
            "//*[@data-rewish-price]",
            "//*[@itemprop='price' and not(ancestor::s) and not(ancestor::del)][1]",
        ),
    )
    old = _price_from_xpaths(
        document,
        (
            "//*[@data-product-price-old]//data[1]",
            "//*[@data-product-price-old]//*[self::span or self::data][1]",
            "//*[@data-product-price-old]",
            "//*[contains(@class,'product-box__main_discount')]//label[1]",
        ),
    )
    valid_until = _attribute(
        document,
        ("//*[@itemprop='priceValidUntil']",),
        ("content",),
    )
    if valid_until:
        valid_until = valid_until.split("T", 1)[0]

    image = normalize_image_url(
        _attribute(
            document,
            (
                "//*[@data-testid='product-image']//img[1]",
                "//*[@data-testid='main-image']//img[1]",
                "//*[contains(@class,'product-gallery')]//img[1]",
                "//*[contains(@class,'product-image')]//img[1]",
                "//img[@itemprop='image'][1]",
                "//picture//source[@srcset][1]",
            ),
            ("src", "data-src", "srcset"),
        ),
        page_url,
    )
    if image and ("placeholder" in image.lower() or "no-image" in image.lower()):
        image = None

    result = _result(
        "foxtrot",
        _text(document, ("//h1[1]", "//meta[@property='og:title']")),
        _attribute(
            document,
            ("//meta[@property='og:description']", "//meta[@name='description']"),
            ("content",),
        ),
        image,
        old,
        current,
        "UAH",
    )
    result.product.discount_end_date = valid_until
    if valid_until:
        result.sources["discount_end_date"] = "store:foxtrot"
    return result


def extract_n11(html_text: str, page_url: str) -> ExtractionResult:
    document = _document(html_text)
    title = _text(
        document,
        (
            "//meta[@property='og:title']",
            "//h1[contains(@class,'proName')]",
            "//h1[contains(@class,'product-name')]",
            "//title",
        ),
    )
    if title:
        title = re.sub(r"\s*[-–—]\s*n11\.com.*$", "", title, flags=re.I).strip()

    raw_image = _attribute(document, ("//meta[@property='og:image']",), ("content",))
    if raw_image and (raw_image.startswith("data:") or "<svg" in raw_image):
        raw_image = None
    raw_image = raw_image or _attribute(
        document,
        (
            "//*[contains(@class,'imgObj')]//img[1]",
            "//*[contains(@class,'unf-p-img')]//img[1]",
            "//*[@id='mainItemImg']",
            "//*[contains(@class,'product-images')]//img[1]",
        ),
        ("data-original", "data-src", "data-lazy", "src"),
    )
    if not raw_image:
        match = re.search(
            r"https://n11scdn\.akamaized\.net/[^\s\"']+\.(?:jpg|png|webp)",
            html_text,
            re.I,
        )
        raw_image = match.group(0) if match else None

    current = _price_from_xpaths(
        document,
        (
            "//*[contains(@class,'newPrice')]//ins[1]",
            "//*[contains(@class,'newPrice')][1]",
            "//*[contains(@class,'sale-price')][1]",
            "//*[@data-price='current'][1]",
            "//*[contains(@class,'unf-p-price-s')][1]",
        ),
    ) or _regex_price(
        html_text,
        (
            r"(?:SEPETTE|indirimli|fiyat)[^<]*?([\d.,\s]+)\s*TL",
            r'"price"\s*:\s*([\d.]+)',
        ),
    )
    old = _price_from_xpaths(
        document,
        (
            "//*[contains(@class,'oldPrice')]//del[1]",
            "//*[contains(@class,'oldPrice')][1]",
            "//*[contains(@class,'old-price')][1]",
            "//*[@data-price='old'][1]",
        ),
    )
    return _result(
        "n11",
        title,
        _attribute(
            document,
            ("//meta[@property='og:description']", "//meta[@name='description']"),
            ("content",),
        ),
        normalize_image_url(raw_image, page_url),
        old,
        current,
        "TRY",
    )


def _aliexpress_script_data(html_text: str) -> dict[str, str]:
    result: dict[str, str] = {}
    key_patterns = {
        "title": (
            r'"subject"\s*:\s*"([^"]{3,300})"',
            r'"productTitle"\s*:\s*"([^"]{3,300})"',
        ),
        "image": (
            r'"imageUrl"\s*:\s*"(https?:\\/\\/[^"]+)"',
            r'"imagePathList"\s*:\s*\[\s*"(https?:\\/\\/[^"]+)"',
        ),
        "description": (r'"description"\s*:\s*"([^"]{3,1000})"',),
        "current_price": (
            r'"minActivityAmount"\s*:\s*"?([\d,.]+)"?',
            r'"activityAmount"\s*:\s*"?([\d,.]+)"?',
            r'"formattedActivityPrice"\s*:\s*"[^"\d]*([\d,.]+)',
            r'"salePrice"\s*:\s*"?([\d,.]+)"?',
            r'"minAmount"\s*:\s*"?([\d,.]+)"?',
        ),
        "old_price": (
            r'"maxAmount"\s*:\s*"?([\d,.]+)"?',
            r'"originalPrice"\s*:\s*"?([\d,.]+)"?',
            r'"listPrice"\s*:\s*"?([\d,.]+)"?',
        ),
    }
    for key, patterns in key_patterns.items():
        for pattern in patterns:
            match = re.search(pattern, html_text, re.I)
            if not match:
                continue
            value = match.group(1).replace("\\/", "/")
            try:
                value = json.loads(f'"{value}"')
            except json.JSONDecodeError:
                pass
            result[key] = value
            break
    return result


def _aliexpress_tracking_prices(
    page_url: str,
) -> tuple[str, str, str] | None:
    query = parse_qs(urlparse(page_url).query)
    npi = unquote(query.get("pdp_npi", [""])[0])
    sku_payload = unquote(query.get("pdp_ext_f", [""])[0])
    sku_match = re.search(r'"sku_id"\s*:\s*"(\d+)"', sku_payload)
    sku_id = query.get("sku_id", [None])[0] or (
        sku_match.group(1) if sku_match else None
    )
    if not npi or not sku_id or sku_id not in npi:
        return None

    price_match = re.search(
        r"!{3,}(\d+(?:\.\d+)?)!(\d+(?:\.\d+)?)!",
        npi,
    )
    if not price_match:
        return None
    return price_match.group(1), price_match.group(2), "USD"


def _result(
    store: str,
    title: str | None,
    description: str | None,
    image: str | None,
    old_price: str | None,
    current_price: str | None,
    currency: str | None,
) -> ExtractionResult:
    if old_price and current_price:
        price, discount_price, has_discount = normalize_discount(old_price, current_price)
    else:
        price, discount_price, has_discount = normalize_price(current_price), None, False
    product = ProductData(
        title=clean_text(title),
        description=clean_text(description),
        image=image,
        price=price,
        discount_price=discount_price,
        has_discount=has_discount,
        currency=normalize_currency(currency),
    )
    source = f"store:{store}"
    sources = {
        field_name: source
        for field_name, value in product.model_dump().items()
        if value not in (None, False)
    }
    if has_discount:
        sources["has_discount"] = source
    return ExtractionResult(product=product, sources=sources)


def _document(html_text: str) -> html.HtmlElement:
    parser = html.HTMLParser(encoding="utf-8", recover=True, huge_tree=False)
    try:
        return html.fromstring(html_text, parser=parser)
    except (etree.ParserError, ValueError):
        return html.fromstring("<html></html>", parser=parser)


def _text(document: html.HtmlElement, xpaths: Iterable[str]) -> str | None:
    for xpath in xpaths:
        nodes = document.xpath(xpath)
        if not nodes:
            continue
        node = nodes[0]
        if isinstance(node, str):
            value = clean_text(node)
        else:
            value = clean_text(
                node.get("content")
                or (node.text_content() if hasattr(node, "text_content") else node.text)
            )
        if value:
            return value
    return None


def _attribute(
    document: html.HtmlElement,
    xpaths: Iterable[str],
    attributes: tuple[str, ...],
) -> str | None:
    for xpath in xpaths:
        nodes = document.xpath(xpath)
        if not nodes:
            continue
        for attribute in attributes:
            value = clean_text(nodes[0].get(attribute))
            if value:
                return value.split()[0] if attribute == "srcset" else value
    return None


def _price_from_xpaths(document: html.HtmlElement, xpaths: Iterable[str]) -> str | None:
    for xpath in xpaths:
        nodes = document.xpath(xpath)
        if not nodes:
            continue
        node = nodes[0]
        raw = (
            node.get("value")
            or node.get("content")
            or node.get("data-rewish-price")
            or node.get("data-price")
            or node.text_content()
        )
        price = normalize_price(raw)
        if price:
            return price
    return None


def _regex_price(html_text: str, patterns: Iterable[str]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, html_text, re.I)
        if match:
            price = normalize_price(match.group(1))
            if price:
                return price
    return None


def _currency_from_text(value: str) -> str | None:
    iso_code = re.search(
        r"(?:\b([A-Z]{3})\s*[\d]|\b[\d][\d\s,.]*\s*([A-Z]{3})\b)",
        value,
    )
    if iso_code:
        currency = normalize_currency(iso_code.group(1) or iso_code.group(2))
        if currency in {
            "AUD",
            "CAD",
            "CHF",
            "EUR",
            "GBP",
            "INR",
            "JPY",
            "PLN",
            "RON",
            "RUB",
            "TRY",
            "UAH",
            "USD",
        }:
            return currency

    patterns = (
        (r"(?:\bUSD\b|US\$|\$)", "USD"),
        (r"(?:\bEUR\b|€)", "EUR"),
        (r"(?:\bGBP\b|£)", "GBP"),
        (r"(?:\bUAH\b|₴|грн)", "UAH"),
        (r"(?:\bTRY\b|₺|\bTL\b)", "TRY"),
        (r"(?:\bINR\b|₹)", "INR"),
    )
    for pattern, currency in patterns:
        if re.search(pattern, value, re.I):
            return currency
    return None

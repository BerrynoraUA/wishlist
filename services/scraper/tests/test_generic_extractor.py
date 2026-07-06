from app.extractors.generic import extract_generic_product
from app.extractors.stores.complex import extract_aliexpress, extract_amazon, extract_asos
from app.extractors.stores.enrichment import (
    EnrichmentKind,
    build_enrichment_request,
    parse_enrichment_response,
)
from app.extractors.stores.registry import extract_store_product


def test_zalora_hong_kong_does_not_treat_dollar_as_usd() -> None:
    html = """
    <html>
      <head>
        <meta property="og:title" content="Project Rock 8 Shoes">
        <meta property="og:image" content="https://static-hk.zacdn.com/product.jpg">
        <meta property="product:price:amount" content="1049.00">
      </head>
      <body>Price: $1,049.00</body>
    </html>
    """

    result = extract_generic_product(
        html,
        "https://www.zalora.com.hk/p/under-armour-project-rock-8-shoes-7273147",
    )

    assert result.product.price == "1049"
    assert result.product.currency == "HKD"


def test_json_ld_prefers_product_matching_requested_listing() -> None:
    html = """
    <script type="application/ld+json">
    [
      {
        "@type": "Product",
        "name": "Recommended helmet",
        "url": "https://sidelineswap.com/gear/other/12406677-recommended",
        "offers": {"@type": "Offer", "price": 2, "priceCurrency": "USD"}
      },
      {
        "@type": "Product",
        "name": "Cascade XRS Pro Helmet (New)",
        "url": "https://sidelineswap.com/gear/lacrosse/11940095-cascade-xrs-pro-helmet-new",
        "offers": {"@type": "Offer", "price": 250, "priceCurrency": "USD"}
      }
    ]
    </script>
    """

    result = extract_generic_product(
        html,
        "https://sidelineswap.com/gear/lacrosse/11940095-cascade-xrs-pro-helmet-new",
    )

    assert result.product.title == "Cascade XRS Pro Helmet (New)"
    assert result.product.price == "250"
    assert result.product.currency == "USD"


def test_sidelineswap_profile_uses_primary_listing_price() -> None:
    html = """
    <meta property="og:title" content="Cascade XRS Pro Helmet (New) | SidelineSwap">
    <meta property="og:image" content="https://edge.images.sidelineswap.com/product.jpeg">
    <span class="text-4xl font-bold">$250.00<sup>USD</sup></span>
    """

    result = extract_store_product(
        html,
        "https://sidelineswap.com/gear/lacrosse/11940095-cascade-xrs-pro-helmet-new",
    )

    assert result is not None
    assert result.product.title == "Cascade XRS Pro Helmet (New)"
    assert result.product.price == "250"
    assert result.product.currency == "USD"


def test_zalora_profile_uses_embedded_product_price() -> None:
    html = """
    <meta property="og:title" content="Project Rock 8 Shoes">
    <meta property="og:image" content="https://static-hk.zacdn.com/product.jpg">
    <script>{"preloadedState":{"pdv":{"product":{"Price":"1049.00"}}}}</script>
    """

    result = extract_store_product(
        html,
        "https://www.zalora.com.hk/p/under-armour-project-rock-8-shoes-7273147",
    )

    assert result is not None
    assert result.product.price == "1049"
    assert result.product.currency == "HKD"


def test_zvab_prefers_listing_image_over_site_assets() -> None:
    html = """
    <html>
      <head>
        <meta property="og:image" content="https://assets.prod.abebookscdn.com/seller.png">
        <meta itemprop="image" content="https://pictures.abebooks.com/inventory/md/md31088816021.jpg">
        <meta itemprop="price" content="2000.00">
        <meta itemprop="priceCurrency" content="EUR">
        <meta name="description" content="Lettre autographe signée">
      </head>
      <body>
        <h1 data-test-id="book-title">
          Cendrars refuse avec véhémence que toute distinction officielle soit associée à son œuvre
        </h1>
      </body>
    </html>
    """

    result = extract_store_product(
        html,
        "https://www.zvab.com/servlet/BookDetailsPL?bi=31088816021",
    )

    assert result is not None
    assert result.product.title is not None
    assert "véhémence" in result.product.title
    assert result.product.image == (
        "https://pictures.abebooks.com/inventory/md/md31088816021.jpg"
    )
    assert result.product.price == "2000"
    assert result.product.currency == "EUR"


def test_souq_uses_product_meta_and_price_instead_of_description_heading() -> None:
    html = """
    <html>
      <head>
        <meta property="og:title" content="MORUCHA RFID Wallet (Model #M75)">
        <meta property="og:image" content="https://souq.co/storage/product.webp">
        <meta property="og:description" content="Premium Bull Leather Construction">
      </head>
      <body>
        <h1>About this item</h1>
        <span class="discounted-unit-price text-primary">$59.99</span>
      </body>
    </html>
    """

    result = extract_store_product(
        html,
        "https://souq.co/product/morucha-rfid-wallet-model-m75-6POe6E",
    )

    assert result is not None
    assert result.product.title == "MORUCHA RFID Wallet (Model #M75)"
    assert result.product.price == "59.99"
    assert result.product.currency == "USD"
    assert result.product.image == "https://souq.co/storage/product.webp"


def test_aliexpress_uses_sku_scoped_tracking_price_when_ssr_has_no_price() -> None:
    html = """
    <html>
      <head>
        <meta property="og:title" content="Korean Retinol Shot Eyes Cream">
        <meta property="og:image" content="https://ae01.alicdn.com/product.jpeg">
      </head>
    </html>
    """
    url = (
        "https://www.aliexpress.com/item/1005009812127841.html"
        "?pdp_ext_f=%7B%22sku_id%22%3A%2212000050249700869%22%7D"
        "&pdp_npi=6%40dis%21UAH%21165%2C59%2169%2C54%21%21%21%2123.64"
        "%219.93%21%402103%2112000050249700869%21gdf%21UA"
    )

    result = extract_aliexpress(html, url)

    assert result.product.price == "23.64"
    assert result.product.discount_price == "9.93"
    assert result.product.has_discount is True
    assert result.product.currency == "USD"


def test_amazon_offer_enrichment_is_scoped_to_requested_asin() -> None:
    product_url = "https://www.amazon.com/example/dp/B0DXKZZF9B/ref=test"

    request = build_enrichment_request(product_url, "<html></html>")

    assert request is not None
    assert request.kind == EnrichmentKind.AMAZON_OFFERS
    assert "asin=B0DXKZZF9B" in request.url
    assert request.headers["Referer"] == product_url
    assert "i18n-prefs=RON" in request.headers["Cookie"]


def test_amazon_store_parser_rejects_generic_shell_title() -> None:
    result = extract_amazon(
        "<html><head><title>Amazon.com</title></head></html>",
        "https://www.amazon.com/example/dp/B0DXKZZF9B",
    )

    assert result.product.title is None


def test_amazon_extracts_price_only_from_selected_variant() -> None:
    html = """
    <html><body><ul role="radiogroup">
      <li data-asin="B08BNQBXS8" data-initiallyselected="true">
        <input role="radio" aria-checked="true">
        <span class="inline-twister-swatch-price">
          <span>1 option from $17.77</span>
        </span>
      </li>
      <li data-asin="B0GXZPRBY8" data-initiallyselected="false">
        <input role="radio" aria-checked="false">
        <span class="inline-twister-swatch-price">
          <span>1 option from $19.77</span>
        </span>
      </li>
    </ul></body></html>
    """

    result = extract_amazon(
        html,
        "https://www.amazon.com/example/dp/B08BNQBXS8",
    )

    assert result.product.price == "17.77"
    assert result.product.currency == "USD"


def test_amazon_skips_offer_enrichment_when_selected_variant_has_price() -> None:
    request = build_enrichment_request(
        "https://www.amazon.com/example/dp/B08BNQBXS8",
        """
        <li data-initiallyselected="true">
          <span class="inline-twister-swatch-price">1 option from $17.77</span>
        </li>
        """,
    )

    assert request is None


def test_amazon_offer_enrichment_extracts_regular_and_sale_price() -> None:
    request = build_enrichment_request(
        "https://www.amazon.com/example/dp/B0DXKZZF9B",
        "<html></html>",
    )
    assert request is not None
    html = """
    <div id="aod-offer-list">
      <span class="a-price a-text-price">
        <span class="a-offscreen">RON 920.19</span>
      </span>
      <span class="a-price">
        <span class="a-offscreen">RON 736.15</span>
      </span>
    </div>
    """

    result = parse_enrichment_response(request, html)

    assert result.product.price == "920.19"
    assert result.product.discount_price == "736.15"
    assert result.product.has_discount is True
    assert result.product.currency == "RON"


def test_asos_enrichment_uses_product_id_and_requested_locale() -> None:
    product_url = (
        "https://www.asos.com/new-balance/boston-city-run-shirt/"
        "prd/209035766#colourWayId-209035776"
    )

    request = build_enrichment_request(product_url, "<html></html>")

    assert request is not None
    assert request.kind == EnrichmentKind.ASOS_PRODUCT
    assert "/products/209035766" in request.url
    assert "currency=EUR" in request.url
    assert "country=UA" in request.url


def test_asos_skips_enrichment_when_stock_price_is_embedded() -> None:
    request = build_enrichment_request(
        "https://www.asos.com/example/prd/209035766",
        "<script>window.asos.pdp.config.stockPriceResponse = '[]';</script>",
    )

    assert request is None


def test_asos_enrichment_extracts_product_price() -> None:
    request = build_enrichment_request(
        "https://www.asos.com/example/prd/209035766",
        "<html></html>",
    )
    assert request is not None
    payload = """
    {
      "name": "New Balance Boston City Run t-shirt in dark green",
      "price": {
        "current": {"value": 40.0, "text": "€40.00"},
        "previous": {"value": 40.0, "text": "€40.00"},
        "currency": "EUR"
      }
    }
    """

    result = parse_enrichment_response(request, payload)

    assert result.product.title == "New Balance Boston City Run t-shirt in dark green"
    assert result.product.price == "40"
    assert result.product.discount_price is None
    assert result.product.has_discount is False
    assert result.product.currency == "EUR"


def test_asos_extracts_exact_product_price_from_embedded_stock_response() -> None:
    html = """
    <html><head>
      <meta property="og:title" content="New Balance Boston City Run t-shirt">
      <meta property="og:image" content="https://images.asos-media.com/product.jpg">
    </head><body>
    <script>
    window.asos.pdp.config.stockPriceResponse = '[{"productId":209035766,"productPrice":{"current":{"value":28.8},"previous":{"value":32},"currency":"GBP","isMarkedDown":true}},{"productId":207720319,"productPrice":{"current":{"value":99},"previous":{"value":99},"currency":"GBP"}}]';
    </script>
    </body></html>
    """

    result = extract_asos(
        html,
        "https://www.asos.com/new-balance/example/prd/209035766",
    )

    assert result.product.title == "New Balance Boston City Run t-shirt"
    assert result.product.price == "32"
    assert result.product.discount_price == "28.8"
    assert result.product.has_discount is True
    assert result.product.currency == "GBP"

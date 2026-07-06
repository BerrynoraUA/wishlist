from app.jina import parse_reader_markdown


def test_nature_et_decouvertes_uses_product_section_price_and_image() -> None:
    url = (
        "https://www.natureetdecouvertes.com/bien-etre/massage/materiel-accessoires/"
        "renpho-masseur-de-pieds-renpho-shiatsu-foot-massager-fm058r-93384690"
    )
    markdown = """
Title: Renpho - masseur de pieds renpho shiatsu foot massager fm058r

Minuteur 15/30min.
Livraison gratuite dès 49€.

# Renpho - masseur de pieds renpho shiatsu foot massager fm058r

![Product](https://cache.natureetdecouvertes.com/Medias/Images/Articles/93384690/product.jpg?width=300)

149,99 €
"""

    result = parse_reader_markdown(markdown, url)

    assert result.product.price == "149.99"
    assert result.product.currency == "EUR"
    assert result.product.image is not None
    assert "/Medias/Images/Articles/93384690/" in result.product.image


def test_okazii_uses_listing_section_instead_of_promoted_products() -> None:
    url = (
        "https://www.okazii.ro/"
        "vidaxl-copertin-retractabil-manual-crem-4-3-m-3420250-a262669828"
    )
    markdown = """
Title: vidaXL Copertina retractabila manuala Crem 4 ? 3 m 3420250

Promovat Copertina 799,00 Lei
![Promoted](https://images.okr.ro/serve/product/promoted-160_160)

![Product](https://images.okr.ro/serve/product/product-235_235)
# vidaXL Copertina retractabila manuala Crem 4 ? 3 m 3420250

* Preț: 2.008,99 Lei
"""

    result = parse_reader_markdown(markdown, url)

    assert result.product.title == "vidaXL Copertina retractabila manuala Crem 4 × 3 m 3420250"
    assert result.product.price == "2008.99"
    assert result.product.currency == "RON"
    assert result.product.image == "https://images.okr.ro/serve/product/product-235_235"


def test_sears_extracts_sale_pair_and_product_image() -> None:
    url = "https://www.sears.com/ecoflow/p-A126471370"
    markdown = """
Title: EcoFlow DELTA Pro 3
URL Source: https://www.sears.com/ecoflow/p-A126471370

![Sears](https://www.sears.com/assets/images/logos/sears_logo.svg)
![Product](https://c.shld.net/rpx/i/s/pi/mp/product.jpg)

# EcoFlow DELTA Pro 3

## ~~ $5,483.12 striked off~~
## $3,289.87 Save - $2193.25 (40%)
"""

    result = parse_reader_markdown(markdown, url)

    assert result.product.price == "5483.12"
    assert result.product.discount_price == "3289.87"
    assert result.product.has_discount is True
    assert result.product.currency == "USD"
    assert result.product.image == "https://c.shld.net/rpx/i/s/pi/mp/product.jpg"


def test_bidorbuy_extracts_listing_price_and_image() -> None:
    url = (
        "https://bidorbuy.co.ke/listing/"
        "spacious-two-bedrooms-house-at-nanyuki-town-for-rent"
    )
    markdown = """
Title: SPACIOUS TWO BEDROOMS HOUSE AT NANYUKI TOWN FOR RENT

![Logo](https://bidorbuy.co.ke/storage/logos/logo.svg)
![Main listing image](https://bidorbuy.co.ke/storage/listings/3304/product.webp)

# SPACIOUS TWO BEDROOMS HOUSE AT NANYUKI TOWN FOR RENT

KSh 15,000
"""

    result = parse_reader_markdown(markdown, url)

    assert result.product.price == "15000"
    assert result.product.currency == "KES"
    assert result.product.image == (
        "https://bidorbuy.co.ke/storage/listings/3304/product.webp"
    )


def test_stockx_uses_buy_now_price_instead_of_navigation_numbers() -> None:
    markdown = """
Title: Nike FC Barcelona Jersey
URL Source: https://stockx.com/en-gb/nike-fc-barcelona-jersey-200506

6 Brands
Buy Now for

## US$135

Last Sale
US$130
"""

    result = parse_reader_markdown(
        markdown,
        "https://stockx.com/en-gb/nike-fc-barcelona-jersey-200506",
    )

    assert result.product.price == "135"
    assert result.product.currency == "USD"


def test_takealot_uses_main_product_price() -> None:
    markdown = """
Title: Redmi Watch 5 Active - Black
URL Source: https://www.takealot.com/redmi-watch-5-active-black/PLID96707778

R 759

Redmi Watch 5 Active 2-inch LCD
Related product R 2,999 Price is 2999 rand
"""

    result = parse_reader_markdown(
        markdown,
        "https://www.takealot.com/redmi-watch-5-active-black/PLID96707778",
    )

    assert result.product.price == "759"
    assert result.product.currency == "ZAR"

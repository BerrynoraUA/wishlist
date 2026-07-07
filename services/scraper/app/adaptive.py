from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from scrapling import Selector

from app.extractors.normalization import (
    clean_text,
    normalize_currency,
    normalize_image_url,
    normalize_price,
)
from app.extractors.result import ExtractionResult
from app.extractors.stores import get_store_profile


@dataclass(frozen=True, slots=True)
class AdaptiveField:
    name: str
    identifier: str
    rules: tuple[str, ...]
    attributes: tuple[str, ...]


_GENERIC_FIELDS = (
    AdaptiveField(
        "title",
        "product.title",
        (
            "//*[@itemprop='name'][1]",
            "//h1[1]",
        ),
        ("content",),
    ),
    AdaptiveField(
        "price",
        "product.price.current",
        (
            "//*[@itemprop='price'][1]",
            "//*[contains(@class,'current-price')][1]",
            "//*[contains(@class,'sale-price')][1]",
            "//*[contains(@class,'product-price')][1]",
        ),
        ("content", "value", "data-price", "data-qaprice"),
    ),
    AdaptiveField(
        "discount_price",
        "product.price.original",
        (
            "//*[contains(@class,'old-price')][1]",
            "//*[contains(@class,'original-price')][1]",
            "//del[1]",
            "//s[1]",
        ),
        ("content", "value", "data-price", "data-qaprice"),
    ),
    AdaptiveField(
        "image",
        "product.image.primary",
        (
            "//*[@itemprop='image'][1]",
            "//*[contains(@class,'product-image')]//img[1]",
            "//main//img[1]",
        ),
        ("content", "src", "data-src", "data-original"),
    ),
    AdaptiveField(
        "description",
        "product.description",
        (
            "//*[@itemprop='description'][1]",
            "//*[contains(@class,'product-description')][1]",
            "//*[@id='productDescription'][1]",
        ),
        ("content",),
    ),
    AdaptiveField(
        "currency",
        "product.currency",
        (
            "//*[@itemprop='priceCurrency'][1]",
            "//*[contains(@class,'currency')][1]",
        ),
        ("content", "value"),
    ),
)


class AdaptiveExtractor:
    def __init__(self, storage_file: Path, percentage: int = 60) -> None:
        self._storage_file = storage_file
        self._percentage = percentage
        storage_file.parent.mkdir(parents=True, exist_ok=True)

    def apply(
        self,
        html_text: str,
        page_url: str,
        extraction: ExtractionResult,
    ) -> ExtractionResult:
        page = Selector(
            content=html_text,
            url=page_url,
            adaptive=True,
            storage_args={
                "storage_file": str(self._storage_file),
                "url": page_url,
            },
        )
        fields = self._fields_for_url(page_url)
        adaptive_used: list[str] = []

        for field in fields:
            direct_element, direct_value = self._find_direct(page, field, page_url)
            expected = self._expected_value(extraction, field.name)
            if direct_element is not None and self._values_agree(
                field.name,
                direct_value,
                expected,
            ):
                page.save(direct_element, field.identifier)
                continue

            if direct_element is not None and expected is None and direct_value is not None:
                if field.name in {"price", "discount_price"}:
                    extraction.warnings.append(
                        f"adaptive_{field.name}_unconfirmed"
                    )
                    continue
                self._set_missing_value(extraction, field.name, direct_value)
                page.save(direct_element, field.identifier)
                extraction.sources[
                    self._source_field_name(extraction, field.name)
                ] = "adaptive:seed"
                continue

            if direct_element is not None:
                extraction.warnings.append(f"adaptive_{field.name}_conflict")
                continue

            adaptive_elements = page.xpath(
                field.rules[0],
                identifier=field.identifier,
                adaptive=True,
                percentage=self._percentage,
            )
            if not adaptive_elements:
                continue
            adaptive_value = self._value_from_element(
                adaptive_elements[0],
                field,
                page_url,
            )
            if adaptive_value is None:
                continue
            if expected is not None and not self._values_agree(
                field.name,
                adaptive_value,
                expected,
            ):
                extraction.warnings.append(f"adaptive_{field.name}_conflict")
                continue
            if expected is None:
                if field.name in {"price", "discount_price"}:
                    extraction.warnings.append(
                        f"adaptive_{field.name}_unconfirmed"
                    )
                    continue
                self._set_missing_value(extraction, field.name, adaptive_value)
            extraction.sources[
                self._source_field_name(extraction, field.name)
            ] = "adaptive:relocated"
            adaptive_used.append(field.name)

        if adaptive_used:
            extraction.warnings.append(
                "adaptive_fields:" + ",".join(sorted(set(adaptive_used)))
            )
        return extraction

    def _fields_for_url(self, page_url: str) -> tuple[AdaptiveField, ...]:
        profile = get_store_profile(page_url)
        if profile is None:
            return _GENERIC_FIELDS
        profile_rules = {
            "title": profile.title,
            "price": profile.current_price,
            "discount_price": profile.old_price,
            "image": profile.image,
            "description": profile.description,
            "currency": profile.currency,
        }
        fields: list[AdaptiveField] = []
        for generic in _GENERIC_FIELDS:
            rule = profile_rules[generic.name]
            if rule is None:
                fields.append(generic)
                continue
            fields.append(
                AdaptiveField(
                    name=generic.name,
                    identifier=generic.identifier,
                    rules=rule.xpaths + generic.rules,
                    attributes=rule.attributes + generic.attributes,
                )
            )
        return tuple(fields)

    def _find_direct(
        self,
        page: Selector,
        field: AdaptiveField,
        page_url: str,
    ) -> tuple[Any | None, str | None]:
        for xpath in field.rules:
            elements = page.xpath(xpath)
            if not elements:
                continue
            value = self._value_from_element(elements[0], field, page_url)
            if value is not None:
                return elements[0], value
        return None, None

    def _value_from_element(
        self,
        element: Any,
        field: AdaptiveField,
        page_url: str,
    ) -> str | None:
        raw_value = None
        for attribute in field.attributes:
            candidate = element.attrib.get(attribute)
            if candidate:
                raw_value = str(candidate)
                break
        if raw_value is None:
            raw_value = str(element.get_all_text(strip=True) or "")

        if field.name in {"price", "discount_price"}:
            return normalize_price(raw_value)
        if field.name == "currency":
            return normalize_currency(raw_value)
        if field.name == "image":
            return normalize_image_url(raw_value, page_url)
        return clean_text(raw_value)

    @staticmethod
    def _expected_value(
        extraction: ExtractionResult,
        field_name: str,
    ) -> str | None:
        product = extraction.product
        if field_name == "price":
            return product.discount_price if product.has_discount else product.price
        if field_name == "discount_price":
            return product.price if product.has_discount else None
        return getattr(product, field_name)

    @staticmethod
    def _values_agree(
        field_name: str,
        candidate: str | None,
        expected: str | None,
    ) -> bool:
        if candidate is None or expected is None:
            return False
        if field_name in {"price", "discount_price"}:
            try:
                return Decimal(candidate) == Decimal(expected)
            except InvalidOperation:
                return False
        if field_name == "currency":
            return candidate.upper() == expected.upper()
        return clean_text(candidate) == clean_text(expected)

    @staticmethod
    def _set_missing_value(
        extraction: ExtractionResult,
        field_name: str,
        value: str,
    ) -> None:
        product = extraction.product
        if field_name == "discount_price":
            return
        setattr(product, field_name, value)

    @staticmethod
    def _source_field_name(
        extraction: ExtractionResult,
        field_name: str,
    ) -> str:
        if field_name == "price" and extraction.product.has_discount:
            return "discount_price"
        if field_name == "discount_price" and extraction.product.has_discount:
            return "price"
        return field_name

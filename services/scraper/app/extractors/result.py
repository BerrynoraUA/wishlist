from dataclasses import dataclass, field

from app.models import ProductData


@dataclass(slots=True)
class ExtractionResult:
    product: ProductData = field(default_factory=ProductData)
    sources: dict[str, str] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def merge_missing(self, other: "ExtractionResult") -> None:
        for field_name in ProductData.model_fields:
            if field_name == "has_discount":
                continue
            current = getattr(self.product, field_name)
            candidate = getattr(other.product, field_name)
            if current is None and candidate is not None:
                setattr(self.product, field_name, candidate)
                source = other.sources.get(field_name)
                if source:
                    self.sources[field_name] = source

        if other.product.has_discount and not self.product.has_discount:
            self.product.has_discount = True
            self.sources["has_discount"] = other.sources.get("has_discount", "derived")

        self.warnings.extend(other.warnings)


from enum import StrEnum

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FetchMode(StrEnum):
    SCRAPLING_HTTP = "scrapling_http"
    SCRAPLING_BROWSER = "scrapling_browser"
    JINA_READER = "jina_reader"
    NOT_ATTEMPTED = "not_attempted"


class ScrapeStrategy(StrEnum):
    FALLBACK = "fallback"
    SCRAPLING_HTTP = "scrapling_http"
    SCRAPLING_BROWSER = "scrapling_browser"
    JINA_READER = "jina_reader"


class ProductData(StrictModel):
    title: str | None = None
    description: str | None = None
    image: str | None = None
    price: str | None = None
    discount_price: str | None = None
    has_discount: bool = False
    discount_end_date: str | None = None
    currency: str | None = None


class QualityResult(StrictModel):
    score: int = Field(ge=0, le=100)
    accepted: bool
    warnings: list[str] = Field(default_factory=list)


class FetchAttemptDiagnostics(StrictModel):
    sequence: int = Field(ge=1)
    mode: FetchMode
    purpose: str
    outcome: str
    duration_ms: int = Field(default=0, ge=0)
    status: int | None = Field(default=None, ge=100, le=599)
    block_reason: str | None = None
    error: str | None = None
    parse_score: int | None = Field(default=None, ge=0, le=100)
    parse_accepted: bool | None = None
    selected: bool = False


class ScrapeDiagnostics(StrictModel):
    fetch_mode: FetchMode
    selected_fetch_mode: FetchMode | None = None
    status: int | None = Field(default=None, ge=100, le=599)
    attempts: list[FetchAttemptDiagnostics] = Field(default_factory=list)
    elapsed_ms: int = Field(default=0, ge=0)
    parser_sources: dict[str, str] = Field(default_factory=dict)


class ScrapeRequest(StrictModel):
    url: HttpUrl
    request_id: str | None = Field(default=None, min_length=1, max_length=128)
    deadline_ms: int = Field(default=59_500, ge=1_000, le=60_000)
    strategy: ScrapeStrategy = ScrapeStrategy.FALLBACK

    @model_validator(mode="after")
    def reject_url_credentials(self) -> "ScrapeRequest":
        if self.url.username is not None or self.url.password is not None:
            raise ValueError("URL credentials are not allowed")
        return self


class ApiFetchRequest(StrictModel):
    url: HttpUrl
    method: Literal["GET", "POST"] = "GET"
    headers: dict[str, str] = Field(default_factory=dict)
    body: str | None = Field(default=None, max_length=100_000)
    deadline_ms: int = Field(default=12_000, ge=1_000, le=30_000)

    @model_validator(mode="after")
    def reject_url_credentials(self) -> "ApiFetchRequest":
        if self.url.username is not None or self.url.password is not None:
            raise ValueError("URL credentials are not allowed")
        allowed_headers = {
            "accept",
            "accept-language",
            "authorization",
            "content-type",
            "origin",
            "referer",
            "user-agent",
            "x-api-key",
            "x-devkey",
            "x-ebay-c-marketplace-id",
            "x-dg-graphql-client-name",
            "x-dg-language",
            "x-dg-portal",
            "x-dg-routename",
        }
        for name, value in self.headers.items():
            if name.lower() not in allowed_headers:
                raise ValueError(f"API header is not allowed: {name}")
            if "\r" in value or "\n" in value or len(value) > 4096:
                raise ValueError(f"Invalid API header value: {name}")
        return self


class ApiFetchAttempt(StrictModel):
    mode: str
    outcome: str
    duration_ms: int = Field(ge=0)
    status: int | None = Field(default=None, ge=100, le=599)
    error: str | None = None


class ApiFetchResponse(StrictModel):
    status: int = Field(ge=100, le=599)
    body: str
    fetch_mode: str
    attempts: list[ApiFetchAttempt]


class ScrapeResponse(StrictModel):
    product: ProductData
    quality: QualityResult
    diagnostics: ScrapeDiagnostics


class ErrorCode(StrEnum):
    INVALID_REQUEST = "invalid_request"
    NOT_IMPLEMENTED = "not_implemented"
    NOT_READY = "not_ready"
    BLOCKED = "blocked"
    RESPONSE_TOO_LARGE = "response_too_large"
    UNSAFE_URL = "unsafe_url"
    UPSTREAM_ERROR = "upstream_error"
    SCRAPE_FAILED = "scrape_failed"


class ErrorDetail(StrictModel):
    code: ErrorCode
    message: str
    request_id: str | None = None
    diagnostics: ScrapeDiagnostics | None = None


class ErrorResponse(StrictModel):
    error: ErrorDetail


class HealthResponse(StrictModel):
    status: str


class ReadinessResponse(StrictModel):
    status: str
    browser_enabled: bool

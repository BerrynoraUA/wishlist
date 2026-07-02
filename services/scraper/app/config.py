from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = Field(default="127.0.0.1", validation_alias="SCRAPER_HOST")
    port: int = Field(default=8001, ge=1, le=65535, validation_alias="SCRAPER_PORT")
    log_level: str = Field(default="info", validation_alias="SCRAPER_LOG_LEVEL")
    audit_log_path: Path = Field(
        default=Path(".data/scrape-audit.jsonl"),
        validation_alias="SCRAPER_AUDIT_LOG_PATH",
    )
    audit_log_max_bytes: int = Field(
        default=20 * 1024 * 1024,
        ge=1024,
        le=1024 * 1024 * 1024,
        validation_alias="SCRAPER_AUDIT_LOG_MAX_BYTES",
    )
    audit_log_backups: int = Field(
        default=5,
        ge=0,
        le=100,
        validation_alias="SCRAPER_AUDIT_LOG_BACKUPS",
    )
    adaptive_db_path: Path = Field(
        default=Path(".data/adaptive.db"),
        validation_alias="SCRAPER_ADAPTIVE_DB_PATH",
    )
    enable_adaptive: bool = Field(
        default=True,
        validation_alias="SCRAPER_ENABLE_ADAPTIVE",
    )
    adaptive_match_percentage: int = Field(
        default=60,
        ge=40,
        le=95,
        validation_alias="SCRAPER_ADAPTIVE_MATCH_PERCENTAGE",
    )
    http_timeout_seconds: float = Field(
        default=8,
        gt=0,
        le=60,
        validation_alias="SCRAPER_HTTP_TIMEOUT_SECONDS",
    )
    http_max_redirects: int = Field(
        default=8,
        ge=0,
        le=20,
        validation_alias="SCRAPER_HTTP_MAX_REDIRECTS",
    )
    max_response_bytes: int = Field(
        default=5 * 1024 * 1024,
        ge=1024,
        le=25 * 1024 * 1024,
        validation_alias="SCRAPER_MAX_RESPONSE_BYTES",
    )
    browser_timeout_ms: int = Field(
        default=15_000,
        ge=1_000,
        le=120_000,
        validation_alias="SCRAPER_BROWSER_TIMEOUT_MS",
    )
    browser_max_pages: int = Field(
        default=2,
        ge=1,
        le=20,
        validation_alias="SCRAPER_BROWSER_MAX_PAGES",
    )
    enable_browser: bool = Field(default=True, validation_alias="SCRAPER_ENABLE_BROWSER")
    enable_proxy: bool = Field(default=False, validation_alias="SCRAPER_ENABLE_PROXY")
    enable_jina: bool = Field(default=True, validation_alias="SCRAPER_ENABLE_JINA")
    proxy_dns_over_https: bool = Field(
        default=False,
        validation_alias="SCRAPER_PROXY_DNS_OVER_HTTPS",
    )
    proxy_url: str | None = Field(
        default=None,
        validation_alias="SCRAPER_PROXY_URL",
        repr=False,
    )
    proxy_urls: Annotated[tuple[str, ...], NoDecode] = Field(
        default=(),
        validation_alias="SCRAPER_PROXY_URLS",
        repr=False,
    )

    @field_validator("host")
    @classmethod
    def validate_host(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("host must not be empty")
        return value

    @field_validator("log_level")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"critical", "error", "warning", "info", "debug"}:
            raise ValueError("unsupported log level")
        return normalized

    @field_validator("proxy_url", mode="before")
    @classmethod
    def normalize_optional_proxy_url(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("proxy_urls", mode="before")
    @classmethod
    def parse_proxy_urls(cls, value: object) -> object:
        if value is None or value == "":
            return ()
        if isinstance(value, str):
            return tuple(part.strip() for part in value.replace("\n", ",").split(",") if part.strip())
        return value

    @property
    def configured_proxy_urls(self) -> tuple[str, ...]:
        values = ((self.proxy_url,) if self.proxy_url else ()) + self.proxy_urls
        return tuple(dict.fromkeys(values))


@lru_cache
def get_settings() -> Settings:
    return Settings()

from functools import lru_cache
from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    enable_jina: bool = Field(default=True, validation_alias="SCRAPER_ENABLE_JINA")

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

@lru_cache
def get_settings() -> Settings:
    return Settings()

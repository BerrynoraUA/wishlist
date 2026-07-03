from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.adaptive import AdaptiveExtractor
from app.audit import ScrapeAuditLogger, ScrapeAuditTrace
from app.config import get_settings
from app.fetching import BrowserFetcher, HttpFetcher
from app.models import (
    ErrorCode,
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    ReadinessResponse,
    ScrapeRequest,
    ScrapeResponse,
)
from app.proxy import ProxyOptions, build_proxy_options
from app.service import ScrapeService, ScrapeServiceError


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    http_fetcher = HttpFetcher(settings)
    browser_fetcher = BrowserFetcher(settings) if settings.enable_browser else None
    proxy_options = (
        build_proxy_options(settings.configured_proxy_urls)
        if settings.enable_proxy
        else ProxyOptions()
    )
    proxy_http_fetcher = (
        HttpFetcher(settings, proxy_options=proxy_options)
        if settings.enable_proxy and proxy_options.configured
        else None
    )
    proxy_browser_fetcher = (
        BrowserFetcher(settings, proxy_options=proxy_options)
        if settings.enable_proxy
        and settings.enable_browser
        and proxy_options.configured
        else None
    )
    adaptive_extractor = (
        AdaptiveExtractor(
            settings.adaptive_db_path,
            settings.adaptive_match_percentage,
        )
        if settings.enable_adaptive
        else None
    )
    audit_logger = ScrapeAuditLogger(
        settings.audit_log_path,
        settings.audit_log_max_bytes,
        settings.audit_log_backups,
    )
    application.state.http_fetcher = http_fetcher
    application.state.browser_fetcher = browser_fetcher
    application.state.proxy_http_fetcher = proxy_http_fetcher
    application.state.proxy_browser_fetcher = proxy_browser_fetcher
    application.state.audit_logger = audit_logger
    application.state.scrape_service = ScrapeService(
        http_fetcher,
        browser_fetcher,
        proxy_http_fetcher,
        proxy_browser_fetcher,
        adaptive_extractor,
        audit_logger,
        enable_jina=settings.enable_jina,
    )
    try:
        yield
    finally:
        if browser_fetcher is not None:
            await browser_fetcher.close()
        if proxy_browser_fetcher is not None:
            await proxy_browser_fetcher.close()
        if proxy_http_fetcher is not None:
            await proxy_http_fetcher.close()
        await http_fetcher.close()


app = FastAPI(
    title="Wishlane Scraper",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/ready", response_model=ReadinessResponse)
async def ready() -> ReadinessResponse:
    settings = get_settings()
    return ReadinessResponse(
        status="ready",
        browser_enabled=settings.enable_browser,
        proxy_enabled=settings.enable_proxy,
        proxy_configured=bool(settings.proxy_url or settings.proxy_urls),
    )


@app.post(
    "/v1/scrape",
    response_model=ScrapeResponse,
    responses={
        400: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
        504: {"model": ErrorResponse},
    },
)
async def scrape(payload: ScrapeRequest, request: Request) -> ScrapeResponse:
    service: ScrapeService = request.app.state.scrape_service
    return await service.scrape(payload)


@app.exception_handler(ScrapeServiceError)
async def handle_scrape_error(
    _request: Request,
    error: ScrapeServiceError,
) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorDetail(
            code=error.code,
            message=error.message,
            request_id=error.request_id,
            diagnostics=error.diagnostics,
        )
    )
    return JSONResponse(
        status_code=error.status_code,
        content=body.model_dump(mode="json"),
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    request: Request,
    error: RequestValidationError,
) -> JSONResponse:
    if request.url.path != "/v1/scrape":
        return JSONResponse(status_code=422, content={"detail": error.errors()})

    body = error.body if isinstance(error.body, dict) else {}
    request_id_value = body.get("request_id")
    request_id = (
        request_id_value
        if isinstance(request_id_value, str) and request_id_value
        else str(uuid4())
    )
    url_value = body.get("url")
    url = url_value if isinstance(url_value, str) else ""
    deadline_value = body.get("deadline_ms")
    deadline_ms = deadline_value if isinstance(deadline_value, int) else 59_500
    audit_logger: ScrapeAuditLogger | None = getattr(
        request.app.state,
        "audit_logger",
        None,
    )
    if audit_logger is not None:
        trace = ScrapeAuditTrace(
            request_id=request_id,
            url=url,
            deadline_ms=deadline_ms,
        )
        try:
            await audit_logger.write(
                trace.finish(
                    outcome="invalid_request",
                    error_code=ErrorCode.INVALID_REQUEST.value,
                    error_message="Request validation failed",
                )
            )
        except Exception:
            pass

    response = ErrorResponse(
        error=ErrorDetail(
            code=ErrorCode.INVALID_REQUEST,
            message="Request validation failed",
            request_id=request_id,
        )
    )
    return JSONResponse(status_code=422, content=response.model_dump(mode="json"))

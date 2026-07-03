import asyncio
import logging
from dataclasses import dataclass
from time import monotonic
from uuid import uuid4

from app.adaptive import AdaptiveExtractor
from app.audit import ScrapeAuditLogger, ScrapeAuditTrace
from app.blocking import BlockReason
from app.extractors.result import ExtractionResult
from app.extractors.stores import (
    build_enrichment_request,
    parse_enrichment_response,
)
from app.fetching import BrowserFetcher, HttpFetcher
from app.fetching.http import FetchError, ResponseTooLargeError
from app.models import (
    ErrorCode,
    FetchMode,
    ScrapeDiagnostics,
    ScrapeRequest,
    ScrapeResponse,
)
from app.parsing import parse_product_html
from app.quality import evaluate_quality
from app.security import UnsafeUrlError
from app.urls import canonicalize_product_url
from app.jina import parse_reader_markdown, reader_url

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ScrapeServiceError(RuntimeError):
    code: ErrorCode
    message: str
    status_code: int
    request_id: str | None = None
    diagnostics: ScrapeDiagnostics | None = None


class ScrapeService:
    def __init__(
        self,
        http_fetcher: HttpFetcher,
        browser_fetcher: BrowserFetcher | None = None,
        proxy_http_fetcher: HttpFetcher | None = None,
        proxy_browser_fetcher: BrowserFetcher | None = None,
        adaptive_extractor: AdaptiveExtractor | None = None,
        audit_logger: ScrapeAuditLogger | None = None,
        enable_jina: bool = False,
    ) -> None:
        self._http_fetcher = http_fetcher
        self._browser_fetcher = browser_fetcher
        self._proxy_http_fetcher = proxy_http_fetcher
        self._proxy_browser_fetcher = proxy_browser_fetcher
        self._adaptive_extractor = adaptive_extractor
        self._audit_logger = audit_logger
        self._enable_jina = enable_jina

    async def scrape(self, request: ScrapeRequest) -> ScrapeResponse:
        started_at = monotonic()
        url = canonicalize_product_url(str(request.url))
        trace = ScrapeAuditTrace(
            request_id=request.request_id or str(uuid4()),
            url=url,
            deadline_ms=request.deadline_ms,
        )
        try:
            async with asyncio.timeout(request.deadline_ms / 1000):
                initial_mode = FetchMode.HTTP_NO_PROXY
                initial_is_reader = False
                try:
                    fetched, selected_attempt = await trace.fetch(
                        initial_mode,
                        "product_page",
                        lambda: self._http_fetcher.fetch(url),
                        timeout_seconds=6,
                    )
                except (FetchError, ResponseTooLargeError) as direct_error:
                    recovered = None
                    recovery_fetchers = (
                        (FetchMode.BROWSER_NO_PROXY, self._browser_fetcher),
                        (FetchMode.HTTP_PROXY, self._proxy_http_fetcher),
                        (FetchMode.BROWSER_PROXY, self._proxy_browser_fetcher),
                    )
                    for recovery_mode, recovery_fetcher in recovery_fetchers:
                        if recovery_fetcher is None:
                            trace.skipped(
                                recovery_mode,
                                "product_page_recovery",
                                "fetcher is disabled or not configured",
                            )
                            continue
                        try:
                            recovered = await trace.fetch(
                                recovery_mode,
                                "product_page_recovery",
                                lambda fetcher=recovery_fetcher: fetcher.fetch(url),
                                timeout_seconds=(
                                    13
                                    if recovery_mode
                                    in {
                                        FetchMode.BROWSER_NO_PROXY,
                                        FetchMode.BROWSER_PROXY,
                                    }
                                    else 6
                                ),
                            )
                            initial_mode = recovery_mode
                            break
                        except (FetchError, ResponseTooLargeError):
                            continue
                    if recovered is None and self._enable_jina:
                        try:
                            recovered = await trace.fetch(
                                FetchMode.JINA_READER,
                                "reader_fallback",
                                lambda: self._http_fetcher.fetch(reader_url(url)),
                                timeout_seconds=6,
                            )
                            initial_mode = FetchMode.JINA_READER
                            initial_is_reader = True
                        except (FetchError, ResponseTooLargeError):
                            raise direct_error
                    if recovered is None:
                        raise direct_error
                    fetched, selected_attempt = recovered
                possible_enrichment = build_enrichment_request(
                    fetched.final_url,
                    fetched.body,
                )
                fetch_mode = initial_mode
                extraction = ExtractionResult()
                quality = evaluate_quality(extraction)

                if not fetched.block.blocked and 200 <= fetched.status < 300:
                    if initial_is_reader:
                        extraction = parse_reader_markdown(fetched.body, url)
                        quality = evaluate_quality(extraction)
                    else:
                        extraction, quality = parse_product_html(
                            fetched.body,
                            fetched.final_url,
                        )
                trace.parsed(
                    selected_attempt,
                    score=quality.score,
                    accepted=quality.accepted,
                    selected=True,
                    sources=extraction.sources,
                )

                should_use_browser = (
                    not initial_is_reader
                    and (fetched.block.blocked or not quality.accepted)
                    and not trace.attempted(FetchMode.BROWSER_NO_PROXY)
                )
                if should_use_browser and self._browser_fetcher is not None:
                    try:
                        browser_result, browser_attempt = await trace.fetch(
                            FetchMode.BROWSER_NO_PROXY,
                            "product_page",
                            lambda: self._browser_fetcher.fetch(
                                url,
                                solve_cloudflare=(
                                    fetched.block.reason == BlockReason.CHALLENGE
                                ),
                            ),
                            timeout_seconds=13,
                        )
                        browser_extraction = ExtractionResult()
                        browser_quality = evaluate_quality(browser_extraction)
                        if (
                            not browser_result.block.blocked
                            and 200 <= browser_result.status < 300
                        ):
                            browser_extraction, browser_quality = parse_product_html(
                                browser_result.body,
                                browser_result.final_url,
                            )
                            if (
                                browser_quality.score >= quality.score
                                or not self._has_any_product_data(extraction)
                            ):
                                fetched = browser_result
                                extraction = browser_extraction
                                quality = browser_quality
                                fetch_mode = FetchMode.BROWSER_NO_PROXY
                                selected_attempt = browser_attempt
                        trace.parsed(
                            browser_attempt,
                            score=browser_quality.score,
                            accepted=browser_quality.accepted,
                            selected=selected_attempt == browser_attempt,
                            sources=browser_extraction.sources,
                        )
                        trace.select(selected_attempt)
                    except (FetchError, ResponseTooLargeError):
                        pass

                elif should_use_browser:
                    trace.skipped(
                        FetchMode.BROWSER_NO_PROXY,
                        "product_page",
                        "browser fetcher is disabled",
                    )

                # A 200 shell with no product data is operationally equivalent
                # to an IP/geo soft block. Escalate after the direct browser has
                # also failed, not only after an explicit 403/429.
                should_use_proxy = (
                    not quality.accepted
                    and self._proxy_http_fetcher is not None
                    and not trace.attempted(FetchMode.HTTP_PROXY)
                )
                if should_use_proxy:
                    try:
                        proxy_result, proxy_attempt = await trace.fetch(
                            FetchMode.HTTP_PROXY,
                            "product_page",
                            lambda: self._proxy_http_fetcher.fetch(url),
                            timeout_seconds=6,
                        )
                        proxy_extraction = ExtractionResult()
                        proxy_quality = evaluate_quality(proxy_extraction)
                        if (
                            not proxy_result.block.blocked
                            and 200 <= proxy_result.status < 300
                        ):
                            proxy_extraction, proxy_quality = parse_product_html(
                                proxy_result.body,
                                proxy_result.final_url,
                            )
                            if (
                                proxy_quality.score >= quality.score
                                or not self._has_any_product_data(extraction)
                            ):
                                fetched = proxy_result
                                extraction = proxy_extraction
                                quality = proxy_quality
                                fetch_mode = FetchMode.HTTP_PROXY
                                selected_attempt = proxy_attempt
                        trace.parsed(
                            proxy_attempt,
                            score=proxy_quality.score,
                            accepted=proxy_quality.accepted,
                            selected=selected_attempt == proxy_attempt,
                            sources=proxy_extraction.sources,
                        )
                        trace.select(selected_attempt)

                        if (
                            (proxy_result.block.blocked or not proxy_quality.accepted)
                            and self._proxy_browser_fetcher is not None
                            and not trace.attempted(FetchMode.BROWSER_PROXY)
                        ):
                            proxy_browser_result, proxy_browser_attempt = await trace.fetch(
                                FetchMode.BROWSER_PROXY,
                                "product_page",
                                lambda: self._proxy_browser_fetcher.fetch(
                                    url,
                                    solve_cloudflare=(
                                        proxy_result.block.reason
                                        == BlockReason.CHALLENGE
                                    ),
                                ),
                                timeout_seconds=13,
                            )
                            proxy_browser_extraction = ExtractionResult()
                            proxy_browser_quality = evaluate_quality(
                                proxy_browser_extraction
                            )
                            if (
                                not proxy_browser_result.block.blocked
                                and 200 <= proxy_browser_result.status < 300
                            ):
                                (
                                    proxy_browser_extraction,
                                    proxy_browser_quality,
                                ) = parse_product_html(
                                    proxy_browser_result.body,
                                    proxy_browser_result.final_url,
                                )
                                if (
                                    proxy_browser_quality.score >= quality.score
                                    or not self._has_any_product_data(extraction)
                                ):
                                    fetched = proxy_browser_result
                                    extraction = proxy_browser_extraction
                                    quality = proxy_browser_quality
                                    fetch_mode = FetchMode.BROWSER_PROXY
                                    selected_attempt = proxy_browser_attempt
                            trace.parsed(
                                proxy_browser_attempt,
                                score=proxy_browser_quality.score,
                                accepted=proxy_browser_quality.accepted,
                                selected=selected_attempt == proxy_browser_attempt,
                                sources=proxy_browser_extraction.sources,
                            )
                            trace.select(selected_attempt)
                        elif proxy_result.block.blocked or not proxy_quality.accepted:
                            trace.skipped(
                                FetchMode.BROWSER_PROXY,
                                "product_page",
                                "proxy browser fetcher is disabled or not configured",
                            )
                    except (FetchError, ResponseTooLargeError):
                        if self._proxy_browser_fetcher is not None:
                            try:
                                (
                                    proxy_browser_result,
                                    proxy_browser_attempt,
                                ) = await trace.fetch(
                                    FetchMode.BROWSER_PROXY,
                                    "product_page_recovery",
                                    lambda: self._proxy_browser_fetcher.fetch(url),
                                    timeout_seconds=13,
                                )
                                proxy_browser_extraction = ExtractionResult()
                                proxy_browser_quality = evaluate_quality(
                                    proxy_browser_extraction
                                )
                                if (
                                    not proxy_browser_result.block.blocked
                                    and 200 <= proxy_browser_result.status < 300
                                ):
                                    (
                                        proxy_browser_extraction,
                                        proxy_browser_quality,
                                    ) = parse_product_html(
                                        proxy_browser_result.body,
                                        proxy_browser_result.final_url,
                                    )
                                    if (
                                        proxy_browser_quality.score >= quality.score
                                        or not self._has_any_product_data(extraction)
                                    ):
                                        fetched = proxy_browser_result
                                        extraction = proxy_browser_extraction
                                        quality = proxy_browser_quality
                                        fetch_mode = FetchMode.BROWSER_PROXY
                                        selected_attempt = proxy_browser_attempt
                                trace.parsed(
                                    proxy_browser_attempt,
                                    score=proxy_browser_quality.score,
                                    accepted=proxy_browser_quality.accepted,
                                    selected=selected_attempt == proxy_browser_attempt,
                                    sources=proxy_browser_extraction.sources,
                                )
                                trace.select(selected_attempt)
                            except (FetchError, ResponseTooLargeError):
                                pass
                        else:
                            trace.skipped(
                                FetchMode.BROWSER_PROXY,
                                "product_page_recovery",
                                "proxy browser fetcher is disabled or not configured",
                            )
                elif not quality.accepted:
                    trace.skipped(
                        FetchMode.HTTP_PROXY,
                        "product_page",
                        "proxy fetcher is disabled or not configured",
                    )
                    trace.skipped(
                        FetchMode.BROWSER_PROXY,
                        "product_page",
                        "proxy browser fetcher is disabled or not configured",
                    )

                if (
                    not quality.accepted
                    and self._proxy_browser_fetcher is not None
                    and not trace.attempted(FetchMode.BROWSER_PROXY)
                ):
                    try:
                        (
                            proxy_browser_result,
                            proxy_browser_attempt,
                        ) = await trace.fetch(
                            FetchMode.BROWSER_PROXY,
                            "product_page",
                            lambda: self._proxy_browser_fetcher.fetch(url),
                            timeout_seconds=13,
                        )
                        proxy_browser_extraction = ExtractionResult()
                        proxy_browser_quality = evaluate_quality(
                            proxy_browser_extraction
                        )
                        if (
                            not proxy_browser_result.block.blocked
                            and 200 <= proxy_browser_result.status < 300
                        ):
                            (
                                proxy_browser_extraction,
                                proxy_browser_quality,
                            ) = parse_product_html(
                                proxy_browser_result.body,
                                proxy_browser_result.final_url,
                            )
                            if (
                                proxy_browser_quality.score >= quality.score
                                or not self._has_any_product_data(extraction)
                            ):
                                fetched = proxy_browser_result
                                extraction = proxy_browser_extraction
                                quality = proxy_browser_quality
                                fetch_mode = FetchMode.BROWSER_PROXY
                                selected_attempt = proxy_browser_attempt
                        trace.parsed(
                            proxy_browser_attempt,
                            score=proxy_browser_quality.score,
                            accepted=proxy_browser_quality.accepted,
                            selected=selected_attempt == proxy_browser_attempt,
                            sources=proxy_browser_extraction.sources,
                        )
                        trace.select(selected_attempt)
                    except (FetchError, ResponseTooLargeError):
                        pass

                enrichment = possible_enrichment or build_enrichment_request(
                    fetched.final_url,
                    fetched.body,
                )
                if enrichment is not None:
                    try:
                        enriched_response, enrichment_attempt = await trace.fetch(
                            FetchMode.HTTP_NO_PROXY,
                            "store_enrichment",
                            lambda: self._http_fetcher.fetch(
                                enrichment.url,
                                headers=enrichment.headers,
                            ),
                            timeout_seconds=4,
                        )
                        enrichment_extraction = ExtractionResult()
                        if (
                            200 <= enriched_response.status < 300
                            and not enriched_response.block.blocked
                        ):
                            enrichment_extraction = parse_enrichment_response(
                                enrichment,
                                enriched_response.body,
                                extraction,
                            )
                            extraction = self._merge_enrichment(
                                extraction,
                                enrichment_extraction,
                            )
                            quality = evaluate_quality(extraction)
                        trace.parsed(
                            enrichment_attempt,
                            score=quality.score,
                            accepted=quality.accepted,
                            selected=False,
                            sources=enrichment_extraction.sources,
                        )
                    except (FetchError, ResponseTooLargeError):
                        pass

                if (
                    self._enable_jina
                    and not quality.accepted
                    and not trace.attempted(FetchMode.JINA_READER)
                ):
                    try:
                        jina_response, jina_attempt = await trace.fetch(
                            FetchMode.JINA_READER,
                            "reader_fallback",
                            lambda: self._http_fetcher.fetch(reader_url(url)),
                            timeout_seconds=6,
                        )
                        jina_extraction = ExtractionResult()
                        jina_quality = evaluate_quality(jina_extraction)
                        if (
                            200 <= jina_response.status < 300
                            and not jina_response.block.blocked
                        ):
                            jina_extraction = parse_reader_markdown(
                                jina_response.body,
                                url,
                            )
                            jina_quality = evaluate_quality(jina_extraction)
                            if jina_quality.score > quality.score:
                                fetched = jina_response
                                extraction = jina_extraction
                                quality = jina_quality
                                fetch_mode = FetchMode.JINA_READER
                                selected_attempt = jina_attempt
                        trace.parsed(
                            jina_attempt,
                            score=jina_quality.score,
                            accepted=jina_quality.accepted,
                            selected=selected_attempt == jina_attempt,
                            sources=jina_extraction.sources,
                        )
                        trace.select(selected_attempt)
                    except (FetchError, ResponseTooLargeError):
                        pass
                elif not quality.accepted:
                    trace.skipped(
                        FetchMode.JINA_READER,
                        "reader_fallback",
                        "Jina reader is disabled",
                    )

                if (
                    self._adaptive_extractor is not None
                    and fetch_mode != FetchMode.JINA_READER
                ):
                    extraction = self._adaptive_extractor.apply(
                        fetched.body,
                        fetched.final_url,
                        extraction,
                    )
                    quality = evaluate_quality(extraction)

                if fetched.block.blocked and not self._has_any_product_data(extraction):
                    raise ScrapeServiceError(
                        code=ErrorCode.BLOCKED,
                        message=f"Target website blocked the request ({fetched.block.reason})",
                        status_code=502,
                        request_id=request.request_id,
                    )
                if (
                    not 200 <= fetched.status < 300
                    and not self._has_any_product_data(extraction)
                ):
                    raise ScrapeServiceError(
                        code=ErrorCode.UPSTREAM_ERROR,
                        message=f"Target website returned HTTP {fetched.status}",
                        status_code=502,
                        request_id=request.request_id,
                    )

                if not self._has_any_product_data(extraction):
                    raise ScrapeServiceError(
                        code=ErrorCode.SCRAPE_FAILED,
                        message="No product data could be extracted",
                        status_code=422,
                        request_id=request.request_id,
                    )
                elapsed_ms = int((monotonic() - started_at) * 1000)
                response = ScrapeResponse(
                    product=extraction.product,
                    quality=quality,
                    diagnostics=trace.diagnostics(
                        elapsed_ms=elapsed_ms,
                        parser_sources=extraction.sources,
                    ),
                )
                await self._write_audit(
                    trace.finish(
                        outcome="success",
                        fetch_mode=fetch_mode,
                        quality_score=quality.score,
                        quality_accepted=quality.accepted,
                        parser_sources=extraction.sources,
                    )
                )
                return response
        except ScrapeServiceError as error:
            await self._write_error(trace, error)
            raise
        except TimeoutError as error:
            service_error = ScrapeServiceError(
                code=ErrorCode.UPSTREAM_ERROR,
                message="Scraping deadline exceeded",
                status_code=504,
                request_id=request.request_id,
            )
            await self._write_error(trace, service_error)
            raise service_error from error
        except UnsafeUrlError as error:
            service_error = ScrapeServiceError(
                code=ErrorCode.UNSAFE_URL,
                message=str(error),
                status_code=400,
                request_id=request.request_id,
            )
            await self._write_error(trace, service_error)
            raise service_error from error
        except ResponseTooLargeError as error:
            service_error = ScrapeServiceError(
                code=ErrorCode.RESPONSE_TOO_LARGE,
                message=str(error),
                status_code=502,
                request_id=request.request_id,
            )
            await self._write_error(trace, service_error)
            raise service_error from error
        except FetchError as error:
            service_error = ScrapeServiceError(
                code=ErrorCode.UPSTREAM_ERROR,
                message=str(error),
                status_code=502,
                request_id=request.request_id,
            )
            await self._write_error(trace, service_error)
            raise service_error from error
        except Exception as error:
            await self._write_audit(
                trace.finish(
                    outcome="internal_error",
                    error_code="internal_error",
                    error_message=type(error).__name__,
                )
            )
            raise

    async def _write_error(
        self,
        trace: ScrapeAuditTrace,
        error: ScrapeServiceError,
    ) -> None:
        error.diagnostics = trace.diagnostics(
            elapsed_ms=int((monotonic() - trace.started_clock) * 1000),
        )
        await self._write_audit(
            trace.finish(
                outcome="failed",
                error_code=error.code.value,
                error_message=error.message,
            )
        )

    async def _write_audit(self, event: dict[str, object]) -> None:
        if self._audit_logger is not None:
            try:
                await self._audit_logger.write(event)
            except Exception:
                logger.exception("Failed to write scrape audit event")

    @staticmethod
    def _merge_enrichment(
        base: ExtractionResult,
        enrichment: ExtractionResult,
    ) -> ExtractionResult:
        if any(source.startswith("api:") for source in enrichment.sources.values()):
            enrichment.merge_missing(base)
            return enrichment
        return enrichment

    @staticmethod
    def _has_any_product_data(extraction: ExtractionResult) -> bool:
        product = extraction.product
        return any((product.title, product.image, product.price, product.description))

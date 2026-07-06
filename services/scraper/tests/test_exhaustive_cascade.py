import asyncio

import pytest

from app.audit import ScrapeAuditTrace
from app.blocking import BlockDecision, BlockReason
from app.fetching.http import FetchError, FetchResult
from app.models import FetchMode, ScrapeRequest
from app.service import ScrapeService, ScrapeServiceError


class FailingHttpFetcher:
    async def fetch(self, _url: str, *, headers: dict[str, str] | None = None):
        del headers
        raise FetchError("HTTP request failed")


class FailingBrowserFetcher:
    async def fetch(self, _url: str, *, solve_cloudflare: bool = False):
        del solve_cloudflare
        raise FetchError("Browser request failed")


class StaticFetcher:
    def __init__(self, result: FetchResult) -> None:
        self.result = result
        self.calls = 0

    async def fetch(self, _url: str, **_kwargs):
        self.calls += 1
        return self.result


def response(*, body: str, blocked: bool = False, status: int = 200) -> FetchResult:
    return FetchResult(
        requested_url="https://example.com/product",
        final_url="https://example.com/product",
        status=status,
        body=body,
        body_bytes=len(body),
        block=BlockDecision(
            blocked,
            BlockReason.ACCESS_DENIED if blocked else None,
        ),
    )


class CapturingAuditLogger:
    def __init__(self) -> None:
        self.events: list[dict[str, object]] = []

    async def write(self, event: dict[str, object]) -> None:
        self.events.append(event)


@pytest.mark.asyncio
async def test_fetch_timeout_is_recorded_as_timeout() -> None:
    trace = ScrapeAuditTrace(
        request_id="timeout-test",
        url="https://example.com/product",
        deadline_ms=1_000,
    )

    async def slow_fetch():
        await asyncio.sleep(1)

    with pytest.raises(FetchError, match="timed out"):
        await trace.fetch(
            FetchMode.BROWSER_PROXY,
            "product_page",
            slow_fetch,
            timeout_seconds=0.01,
        )

    assert trace.attempts[0]["outcome"] == "timeout"
    assert trace.attempts[0]["mode"] == FetchMode.BROWSER_PROXY.value


@pytest.mark.asyncio
async def test_intermediate_errors_continue_to_jina_and_error_keeps_trace() -> None:
    audit_logger = CapturingAuditLogger()
    service = ScrapeService(
        FailingHttpFetcher(),
        FailingBrowserFetcher(),
        FailingHttpFetcher(),
        FailingBrowserFetcher(),
        audit_logger=audit_logger,
        enable_jina=True,
    )

    with pytest.raises(ScrapeServiceError) as raised:
        await service.scrape(
            ScrapeRequest(
                url="https://example.com/product",
                request_id="cascade-test",
                deadline_ms=10_000,
            )
        )

    diagnostics = raised.value.diagnostics
    assert diagnostics is not None
    attempted_modes = [
        attempt.mode
        for attempt in diagnostics.attempts
        if attempt.outcome != "skipped"
    ]
    assert attempted_modes == [
        FetchMode.HTTP_NO_PROXY,
        FetchMode.BROWSER_NO_PROXY,
        FetchMode.HTTP_PROXY,
        FetchMode.BROWSER_PROXY,
        FetchMode.JINA_READER,
    ]
    assert diagnostics.fetch_mode == FetchMode.JINA_READER

    audit_attempts = audit_logger.events[-1]["attempts"]
    assert isinstance(audit_attempts, list)
    assert [attempt["mode"] for attempt in audit_attempts] == [
        attempt.mode.value for attempt in diagnostics.attempts
    ]


@pytest.mark.asyncio
async def test_incomplete_received_html_stops_without_browser_or_proxy() -> None:
    direct = StaticFetcher(response(body="<html><title>Real product</title></html>"))
    browser = StaticFetcher(response(body="<html><title>Browser product</title></html>"))
    proxy = StaticFetcher(response(body="<html><title>Proxy product</title></html>"))
    proxy_browser = StaticFetcher(
        response(body="<html><title>Proxy browser product</title></html>")
    )
    service = ScrapeService(
        direct,
        browser,
        proxy,
        proxy_browser,
        enable_jina=True,
    )

    result = await service.scrape(
        ScrapeRequest(
            url="https://example.com/product",
            request_id="incomplete-stop",
            deadline_ms=10_000,
        )
    )

    assert result.quality.accepted is False
    assert [attempt.mode for attempt in result.diagnostics.attempts] == [
        FetchMode.HTTP_NO_PROXY
    ]
    assert browser.calls == 0
    assert proxy.calls == 0
    assert proxy_browser.calls == 0


@pytest.mark.asyncio
async def test_incomplete_browser_result_stops_before_jina_and_proxy() -> None:
    direct = StaticFetcher(
        response(body="<html><title>Access denied</title></html>", blocked=True, status=403)
    )
    browser = StaticFetcher(response(body="<html><title>Real product</title></html>"))
    proxy = StaticFetcher(response(body="<html><title>Proxy product</title></html>"))
    proxy_browser = StaticFetcher(
        response(body="<html><title>Proxy browser product</title></html>")
    )
    service = ScrapeService(
        direct,
        browser,
        proxy,
        proxy_browser,
        enable_jina=True,
    )

    result = await service.scrape(
        ScrapeRequest(
            url="https://example.com/product",
            request_id="incomplete-browser-stop",
            deadline_ms=10_000,
        )
    )

    assert result.quality.accepted is False
    assert [attempt.mode for attempt in result.diagnostics.attempts] == [
        FetchMode.HTTP_NO_PROXY,
        FetchMode.BROWSER_NO_PROXY,
    ]
    assert proxy.calls == 0
    assert proxy_browser.calls == 0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "body",
    [
        "<html></html>",
        "<html><title>The page you are looking for cannot be found.</title></html>",
    ],
)
async def test_empty_or_placeholder_200_continues_to_jina(body: str) -> None:
    direct = StaticFetcher(response(body=body))
    browser = StaticFetcher(response(body=body))
    proxy = StaticFetcher(response(body=body))
    proxy_browser = StaticFetcher(response(body=body))
    service = ScrapeService(
        direct,
        browser,
        proxy,
        proxy_browser,
        enable_jina=True,
    )

    try:
        result = await service.scrape(
            ScrapeRequest(
                url="https://example.com/product",
                request_id="empty-cascade",
                deadline_ms=10_000,
            )
        )
        diagnostics = result.diagnostics
    except ScrapeServiceError as error:
        assert error.diagnostics is not None
        diagnostics = error.diagnostics

    assert [
        attempt.mode
        for attempt in diagnostics.attempts
        if attempt.outcome != "skipped"
    ] == [
        FetchMode.HTTP_NO_PROXY,
        FetchMode.BROWSER_NO_PROXY,
        FetchMode.HTTP_PROXY,
        FetchMode.BROWSER_PROXY,
        FetchMode.JINA_READER,
    ]

import asyncio

import pytest

from app.audit import ScrapeAuditTrace
from app.fetching.http import FetchError
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

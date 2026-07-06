import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

from scrapling.fetchers import AsyncStealthySession

from app.blocking import classify_block
from app.config import Settings
from app.fetching.http import (
    FetchError,
    FetchResult,
    ResponseTooLargeError,
    decode_response_body,
)
from app.proxy import ProxyOptions
from app.security import UnsafeUrlError, validate_public_url


class BrowserFetcher:
    def __init__(
        self,
        settings: Settings,
        *,
        session_factory: Callable[..., Any] = AsyncStealthySession,
        url_validator: Callable[[str], Awaitable[None]] = validate_public_url,
        proxy_options: ProxyOptions | None = None,
    ) -> None:
        self._settings = settings
        self._session_factory = session_factory
        self._url_validator = url_validator
        self._proxy_options = proxy_options or ProxyOptions()
        self._manager: Any | None = None
        self._session: Any | None = None
        self._lifecycle_lock = asyncio.Lock()
        self._semaphore = asyncio.Semaphore(settings.browser_max_pages)

    @property
    def started(self) -> bool:
        return self._session is not None

    async def start(self) -> None:
        async with self._lifecycle_lock:
            if self._session is not None:
                return
            session_options: dict[str, Any] = {}
            if self._proxy_options.proxy is not None:
                session_options["proxy"] = self._proxy_options.proxy
            if self._proxy_options.proxy_rotator is not None:
                session_options["proxy_rotator"] = self._proxy_options.proxy_rotator
            manager = self._session_factory(
                headless=True,
                max_pages=self._settings.browser_max_pages,
                block_webrtc=True,
                allow_webgl=True,
                block_ads=True,
                timeout=self._settings.browser_timeout_ms,
                retries=1,
                dns_over_https=(
                    self._settings.proxy_dns_over_https
                    and self._proxy_options.configured
                ),
                **session_options,
            )
            self._session = await manager.__aenter__()
            self._manager = manager

    async def close(self) -> None:
        async with self._lifecycle_lock:
            if self._manager is None:
                self._session = None
                return
            manager = self._manager
            self._manager = None
            self._session = None
            await manager.__aexit__(None, None, None)

    async def fetch(
        self,
        url: str,
        *,
        solve_cloudflare: bool = False,
    ) -> FetchResult:
        await self._url_validator(url)
        try:
            await self.start()
        except UnsafeUrlError:
            raise
        except Exception as error:
            raise FetchError("Browser session failed to start") from error
        if self._session is None:
            raise FetchError("Browser session failed to start")

        async with self._semaphore:
            try:
                response = await self._session.fetch(
                    url,
                    timeout=self._settings.browser_timeout_ms,
                    solve_cloudflare=solve_cloudflare,
                    page_setup=self._guard_navigation,
                    load_dom=True,
                    network_idle=False,
                )
            except UnsafeUrlError:
                raise
            except Exception as error:
                raise FetchError("Browser request failed") from error

        final_url = str(response.url)
        await self._url_validator(final_url)
        raw_body = bytes(response.body)
        if len(raw_body) > self._settings.max_response_bytes:
            raise ResponseTooLargeError("Browser response exceeds the configured size limit")
        status = int(response.status)
        response_headers = {
            str(key).lower(): str(value)
            for key, value in dict(getattr(response, "headers", {}) or {}).items()
        }
        body = decode_response_body(raw_body, response_headers)
        return FetchResult(
            requested_url=url,
            final_url=final_url,
            status=status,
            body=body,
            body_bytes=len(raw_body),
            block=classify_block(status, body),
            response_headers=response_headers,
        )

    async def _guard_navigation(self, page: Any) -> None:
        async def guard(route: Any, request: Any) -> None:
            if not request.is_navigation_request():
                await route.continue_()
                return
            try:
                await self._url_validator(request.url)
            except UnsafeUrlError:
                await route.abort("blockedbyclient")
                return
            await route.continue_()

        await page.route("**/*", guard)

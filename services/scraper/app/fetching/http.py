import asyncio
import codecs
import re
from dataclasses import dataclass, field
from collections.abc import Awaitable, Callable
from typing import Any

from scrapling.fetchers import FetcherSession

from app.blocking import BlockDecision, classify_block
from app.config import Settings
from app.security import validate_public_url


class FetchError(RuntimeError):
    pass


class ResponseTooLargeError(FetchError):
    pass


@dataclass(frozen=True, slots=True)
class FetchResult:
    requested_url: str
    final_url: str
    status: int
    body: str
    body_bytes: int
    block: BlockDecision
    response_headers: dict[str, str] = field(default_factory=dict)


class HttpFetcher:
    def __init__(
        self,
        settings: Settings,
        *,
        session_factory: Callable[..., Any] = FetcherSession,
        url_validator: Callable[[str], Awaitable[None]] = validate_public_url,
    ) -> None:
        self._settings = settings
        self._session_factory = session_factory
        self._url_validator = url_validator
        self._manager: Any | None = None
        self._session: Any | None = None
        self._lifecycle_lock = asyncio.Lock()

    @property
    def started(self) -> bool:
        return self._session is not None

    async def start(self) -> None:
        async with self._lifecycle_lock:
            if self._session is not None:
                return
            manager = self._session_factory(
                impersonate="chrome",
                stealthy_headers=True,
                http3=False,
                timeout=self._settings.http_timeout_seconds,
                retries=1,
                retry_delay=0.25,
                follow_redirects="safe",
                max_redirects=self._settings.http_max_redirects,
                verify=True,
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
        headers: dict[str, str] | None = None,
        method: str = "GET",
        body: str | None = None,
    ) -> FetchResult:
        await self._url_validator(url)
        await self.start()
        if self._session is None:
            raise FetchError("HTTP session failed to start")

        try:
            if method == "POST":
                response = await self._session.post(
                    url,
                    headers=headers or {},
                    data=body or "",
                )
            else:
                response = await self._session.get(url, headers=headers or {})
        except Exception as error:
            raise FetchError("HTTP request failed") from error

        final_url = str(response.url)
        await self._url_validator(final_url)
        raw_body = bytes(response.body)
        if len(raw_body) > self._settings.max_response_bytes:
            raise ResponseTooLargeError("Upstream response exceeds the configured size limit")
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


def decode_response_body(raw_body: bytes, headers: dict[str, str]) -> str:
    content_type = headers.get("content-type", "")
    match = re.search(r"charset\s*=\s*[\"']?([^;\"'\s]+)", content_type, re.I)
    charset = match.group(1) if match else "utf-8"
    try:
        codecs.lookup(charset)
    except LookupError:
        charset = "utf-8"
    return raw_body.decode(charset, errors="replace")

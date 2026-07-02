import asyncio
import json
import os
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from time import monotonic
from typing import Any, Awaitable, Callable, TypeVar
from urllib.parse import urlsplit, urlunsplit

from app.fetching.http import FetchResult
from app.models import FetchMode

T = TypeVar("T", bound=FetchResult)


def sanitized_url(value: str) -> str:
    parts = urlsplit(value)
    return urlunsplit((parts.scheme, parts.hostname or "", parts.path, "", ""))


@dataclass(slots=True)
class ScrapeAuditTrace:
    request_id: str
    url: str
    deadline_ms: int
    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    started_clock: float = field(default_factory=monotonic)
    attempts: list[dict[str, Any]] = field(default_factory=list)

    async def fetch(
        self,
        mode: FetchMode,
        purpose: str,
        operation: Callable[[], Awaitable[T]],
    ) -> tuple[T, int]:
        started = monotonic()
        attempt: dict[str, Any] = {
            "sequence": len(self.attempts) + 1,
            "mode": mode.value,
            "purpose": purpose,
        }
        self.attempts.append(attempt)
        index = len(self.attempts) - 1
        try:
            result = await operation()
        except Exception as error:
            attempt.update(
                {
                    "outcome": "error",
                    "duration_ms": int((monotonic() - started) * 1000),
                    "error_type": type(error).__name__,
                    "error": str(error)[:500],
                }
            )
            raise

        attempt.update(
            {
                "outcome": "blocked" if result.block.blocked else "received",
                "duration_ms": int((monotonic() - started) * 1000),
                "status": result.status,
                "block_reason": (
                    result.block.reason.value if result.block.reason is not None else None
                ),
                "body_bytes": result.body_bytes,
                "final_url": sanitized_url(result.final_url),
            }
        )
        return result, index

    def parsed(
        self,
        attempt_index: int,
        *,
        score: int,
        accepted: bool,
        selected: bool,
        sources: dict[str, str],
    ) -> None:
        self.attempts[attempt_index].update(
            {
                "parse_score": score,
                "parse_accepted": accepted,
                "selected": selected,
                "fields": sorted(sources),
            }
        )

    def select(self, attempt_index: int) -> None:
        for attempt in self.attempts:
            attempt["selected"] = False
        self.attempts[attempt_index]["selected"] = True

    def finish(
        self,
        *,
        outcome: str,
        fetch_mode: FetchMode | None = None,
        quality_score: int | None = None,
        quality_accepted: bool | None = None,
        parser_sources: dict[str, str] | None = None,
        error_code: str | None = None,
        error_message: str | None = None,
    ) -> dict[str, Any]:
        return {
            "schema_version": 1,
            "timestamp": self.started_at.isoformat(),
            "request_id": self.request_id,
            "url": sanitized_url(self.url),
            "deadline_ms": self.deadline_ms,
            "outcome": outcome,
            "elapsed_ms": int((monotonic() - self.started_clock) * 1000),
            "final_fetch_mode": fetch_mode.value if fetch_mode is not None else None,
            "quality": {
                "score": quality_score,
                "accepted": quality_accepted,
            },
            "parser_sources": parser_sources or {},
            "error": (
                {"code": error_code, "message": (error_message or "")[:500]}
                if error_code
                else None
            ),
            "attempts": self.attempts,
        }


class ScrapeAuditLogger:
    def __init__(self, path: Path, max_bytes: int, backups: int) -> None:
        self._path = path
        self._max_bytes = max_bytes
        self._backups = backups
        self._lock = asyncio.Lock()

    async def write(self, event: dict[str, Any]) -> None:
        line = json.dumps(
            event,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        async with self._lock:
            await asyncio.to_thread(self._write_sync, line)

    def _write_sync(self, line: str) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        encoded_size = len(line.encode("utf-8")) + 1
        current_size = self._path.stat().st_size if self._path.exists() else 0
        if current_size + encoded_size > self._max_bytes:
            self._rotate()
        with self._path.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(line)
            handle.write("\n")
            handle.flush()

    def _rotate(self) -> None:
        if self._backups == 0:
            self._path.unlink(missing_ok=True)
            return
        oldest = self._path.with_name(f"{self._path.name}.{self._backups}")
        oldest.unlink(missing_ok=True)
        for number in range(self._backups - 1, 0, -1):
            source = self._path.with_name(f"{self._path.name}.{number}")
            if source.exists():
                os.replace(
                    source,
                    self._path.with_name(f"{self._path.name}.{number + 1}"),
                )
        if self._path.exists():
            os.replace(self._path, self._path.with_name(f"{self._path.name}.1"))

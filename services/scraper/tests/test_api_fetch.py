from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.main import api_fetch
from app.models import ApiFetchRequest


class FakeFetcher:
    def __init__(self, status: int, body: str, *, blocked: bool) -> None:
        self.status = status
        self.body = body
        self.blocked = blocked
        self.calls = 0
        self.last_method = ""
        self.last_body: str | None = None

    async def fetch(
        self,
        _url: str,
        *,
        headers: dict[str, str] | None = None,
        method: str = "GET",
        body: str | None = None,
    ):
        del headers
        self.calls += 1
        self.last_method = method
        self.last_body = body
        return SimpleNamespace(
            status=self.status,
            body=self.body,
            block=SimpleNamespace(blocked=self.blocked),
        )


def fake_request(direct: FakeFetcher, proxy: FakeFetcher | None):
    return SimpleNamespace(
        app=SimpleNamespace(
            state=SimpleNamespace(
                http_fetcher=direct,
                proxy_http_fetcher=proxy,
            )
        )
    )


@pytest.mark.asyncio
async def test_blocked_direct_api_continues_through_proxy() -> None:
    direct = FakeFetcher(403, "blocked", blocked=True)
    proxy = FakeFetcher(200, '{"title":"Product"}', blocked=False)

    response = await api_fetch(
        ApiFetchRequest(url="https://www.meesho.com/api/v1/product/1kv4b"),
        fake_request(direct, proxy),
    )

    assert response.status == 200
    assert response.fetch_mode == "python_api_proxy"
    assert [attempt.outcome for attempt in response.attempts] == ["blocked", "received"]
    assert direct.calls == 1
    assert proxy.calls == 1


@pytest.mark.asyncio
async def test_successful_direct_api_does_not_use_proxy() -> None:
    direct = FakeFetcher(200, '{"title":"Product"}', blocked=False)
    proxy = FakeFetcher(200, '{"title":"Proxy Product"}', blocked=False)

    response = await api_fetch(
        ApiFetchRequest(url="https://api.discogs.com/releases/1"),
        fake_request(direct, proxy),
    )

    assert response.fetch_mode == "python_api_http"
    assert len(response.attempts) == 1
    assert proxy.calls == 0


@pytest.mark.asyncio
async def test_missing_proxy_is_recorded_as_skipped() -> None:
    direct = FakeFetcher(403, "blocked", blocked=True)

    response = await api_fetch(
        ApiFetchRequest(url="https://www.noon.com/_svc/catalog/api/v3/u/N1/pdp"),
        fake_request(direct, None),
    )

    assert response.status == 403
    assert [attempt.outcome for attempt in response.attempts] == ["blocked", "skipped"]


def test_api_fetch_rejects_unrestricted_headers() -> None:
    with pytest.raises(ValidationError):
        ApiFetchRequest(
            url="https://api.discogs.com/releases/1",
            headers={"Host": "internal.example"},
        )


def test_api_fetch_accepts_allowlisted_graphql_post() -> None:
    request = ApiFetchRequest(
        url="https://www.galaxus.ch/api/graphql/get-products-with-offer-default",
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-dg-portal": "22",
        },
        body='[{"variables":{"productIds":[67998867]}}]',
    )

    assert request.method == "POST"


@pytest.mark.asyncio
async def test_api_fetch_forwards_graphql_post_body() -> None:
    direct = FakeFetcher(200, '[{"data":{}}]', blocked=False)
    body = '[{"variables":{"productIds":[67998867]}}]'

    response = await api_fetch(
        ApiFetchRequest(
            url="https://www.galaxus.ch/api/graphql/get-products-with-offer-default",
            method="POST",
            headers={
                "Content-Type": "application/json",
                "x-dg-portal": "22",
            },
            body=body,
        ),
        fake_request(direct, None),
    )

    assert response.status == 200
    assert direct.last_method == "POST"
    assert direct.last_body == body

from dataclasses import dataclass
from urllib.parse import urlsplit, urlunsplit

from scrapling.fetchers import ProxyRotator


@dataclass(frozen=True, slots=True)
class ProxyOptions:
    proxy: str | None = None
    proxy_rotator: ProxyRotator | None = None

    @property
    def configured(self) -> bool:
        return self.proxy is not None or self.proxy_rotator is not None


def build_proxy_options(proxy_urls: tuple[str, ...]) -> ProxyOptions:
    validated = tuple(_validate_proxy_url(url) for url in proxy_urls)
    if not validated:
        return ProxyOptions()
    if len(validated) == 1:
        return ProxyOptions(proxy=validated[0])
    return ProxyOptions(proxy_rotator=ProxyRotator(list(validated)))


def redact_proxy_url(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.username is None and parsed.password is None:
        return value
    hostname = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    return urlunsplit(
        (
            parsed.scheme,
            f"***:***@{hostname}{port}",
            parsed.path,
            parsed.query,
            parsed.fragment,
        )
    )


def _validate_proxy_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme not in {"http", "https", "socks5", "socks5h"}:
        raise ValueError("Proxy URL must use http, https, socks5, or socks5h")
    if not parsed.hostname:
        raise ValueError("Proxy URL must contain a hostname")
    return value.strip()


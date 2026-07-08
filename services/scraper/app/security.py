import asyncio
import ipaddress
import socket
from collections.abc import Awaitable, Callable, Iterable
from urllib.parse import urlparse


class UnsafeUrlError(ValueError):
    pass


Resolver = Callable[[str, int], Awaitable[Iterable[str]]]


async def validate_public_url(
    url: str,
    *,
    resolver: Resolver | None = None,
) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise UnsafeUrlError("Only HTTP and HTTPS URLs are allowed")
    if parsed.username is not None or parsed.password is not None:
        raise UnsafeUrlError("URL credentials are not allowed")
    if not parsed.hostname:
        raise UnsafeUrlError("URL hostname is required")

    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    resolve = resolver or _resolve_addresses
    addresses = tuple(await resolve(parsed.hostname, port))
    if not addresses:
        raise UnsafeUrlError("URL hostname did not resolve")
    validate_public_addresses(addresses)


def validate_public_addresses(addresses: Iterable[str]) -> None:
    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError as error:
            raise UnsafeUrlError("Hostname resolved to an invalid IP address") from error
        if not ip.is_global:
            raise UnsafeUrlError("Private or reserved IP addresses are not allowed")


async def _resolve_addresses(hostname: str, port: int) -> tuple[str, ...]:
    loop = asyncio.get_running_loop()
    try:
        records = await loop.getaddrinfo(
            hostname,
            port,
            family=socket.AF_UNSPEC,
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as error:
        raise UnsafeUrlError("URL hostname could not be resolved") from error
    return tuple(dict.fromkeys(record[4][0] for record in records))


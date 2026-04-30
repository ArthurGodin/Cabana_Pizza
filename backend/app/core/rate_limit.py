from __future__ import annotations

from collections import defaultdict, deque
from time import monotonic
from threading import Lock
from typing import Callable

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, *, key: str, limit: int, window_seconds: int) -> None:
        now = monotonic()
        cutoff = now - window_seconds

        with self._lock:
            hits = self._hits[key]

            while hits and hits[0] <= cutoff:
                hits.popleft()

            if len(hits) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.",
                    headers={"Retry-After": str(window_seconds)},
                )

            hits.append(now)


limiter = InMemoryRateLimiter()


def rate_limit(scope: str, *, limit: int, window_seconds: int) -> Callable[[Request], None]:
    def dependency(request: Request) -> None:
        client_ip = extract_client_ip(request)
        limiter.check(
            key=f"{scope}:{client_ip}",
            limit=limit,
            window_seconds=window_seconds,
        )

    return dependency


def extract_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client:
        return request.client.host

    return "unknown"

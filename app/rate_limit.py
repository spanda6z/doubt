"""Simple in-memory rate limiter (per-process)."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, DefaultDict


class RateLimiter:
    def __init__(self, max_calls: int, window_seconds: float = 60.0):
        self.max_calls = max_calls
        self.window = window_seconds
        self._hits: DefaultDict[str, Deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.max_calls:
            return False
        q.append(now)
        return True


verdict_limiter = RateLimiter(max_calls=60, window_seconds=60.0)

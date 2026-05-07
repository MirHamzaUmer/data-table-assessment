import hashlib
import json
from typing import Optional

import redis.asyncio as redis

from app.config import settings


redis_client: redis.Redis = redis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    health_check_interval=30,
)


async def get_cache(key: str) -> Optional[str]:
    try:
        value = await redis_client.get(key)
        return value
    except Exception:
        return None


async def set_cache(key: str, value: str, ttl: int = 60) -> None:
    try:
        await redis_client.set(key, value, ex=ttl)
    except Exception:
        pass


async def make_cache_key(prefix: str, params: dict) -> str:
    serialized = json.dumps(params, sort_keys=True, default=str)
    digest = hashlib.md5(serialized.encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


async def ping() -> bool:
    try:
        return bool(await redis_client.ping())
    except Exception:
        return False

from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from app.cache import ping as redis_ping
from app.database import engine
from app.routers import orders as orders_router
from app.routers import products as products_router
from app.routers import users as users_router


app = FastAPI(
    title="DataTable API",
    description=(
        "High-performance API serving 100k+ products with paginated, "
        "filterable, sortable, and cached responses."
    ),
    version="1.0.0",
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router.router, prefix="/api/products", tags=["products"])
app.include_router(users_router.router, prefix="/api/users", tags=["users"])
app.include_router(orders_router.router, prefix="/api/orders", tags=["orders"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.on_event("startup")
async def startup_event() -> None:
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    redis_ok = await redis_ping()
    print(f">>> Startup OK — db: ok, redis: {'ok' if redis_ok else 'unavailable'}")

import json
import time
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import get_cache, make_cache_key, set_cache
from app.database import get_db
from app.models import Order
from app.schemas import OrderResponse, Paginated


router = APIRouter()


SORTABLE_COLUMNS = {"total", "status", "created_at"}


@router.get("/", response_model=Paginated[OrderResponse])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    cache_params = {
        "page": page,
        "page_size": page_size,
        "sort_by": sort_by,
        "sort_order": sort_order,
        "status": status,
    }
    cache_key = await make_cache_key("orders:list", cache_params)
    cached = await get_cache(cache_key)
    if cached is not None:
        return json.loads(cached)

    start = time.perf_counter()

    if sort_by not in SORTABLE_COLUMNS:
        sort_by = "created_at"
    direction = desc if sort_order.lower() == "desc" else asc
    sort_col = getattr(Order, sort_by)

    base = select(
        Order.id,
        Order.user_id,
        Order.total,
        Order.status,
        Order.created_at,
    )
    count_q = select(func.count()).select_from(Order)

    if status:
        base = base.where(Order.status == status)
        count_q = count_q.where(Order.status == status)

    base = base.order_by(direction(sort_col)).limit(page_size).offset((page - 1) * page_size)

    total = (await db.execute(count_q)).scalar_one()
    rows = (await db.execute(base)).all()

    data = [
        {
            "id": str(r.id),
            "user_id": str(r.user_id),
            "total": float(r.total),
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]

    total_pages = (total + page_size - 1) // page_size if page_size else 0
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    response = {
        "data": data,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
        "query_time_ms": elapsed_ms,
    }
    await set_cache(cache_key, json.dumps(response), ttl=60)
    return response

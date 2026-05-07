import time
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import get_cache, make_cache_key, set_cache
from app.database import get_db
from app.models import Product
from app.schemas import (
    Paginated,
    PaginationMeta,
    ProductMeta,
    ProductResponse,
)

import json


router = APIRouter()


SORTABLE_COLUMNS = {
    "name",
    "category",
    "price",
    "stock",
    "sku",
    "status",
    "created_at",
    "updated_at",
}


@router.get("/", response_model=Paginated[ProductResponse])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
):
    cache_params = {
        "page": page,
        "page_size": page_size,
        "search": search,
        "category": category,
        "status": status,
        "sort_by": sort_by,
        "sort_order": sort_order,
        "price_min": price_min,
        "price_max": price_max,
    }
    cache_key = await make_cache_key("products:list", cache_params)
    cached = await get_cache(cache_key)
    if cached is not None:
        return json.loads(cached)

    start = time.perf_counter()

    if sort_by not in SORTABLE_COLUMNS:
        sort_by = "created_at"
    direction = desc if sort_order.lower() == "desc" else asc
    sort_col = getattr(Product, sort_by)

    base = select(
        Product.id,
        Product.name,
        Product.category,
        Product.price,
        Product.stock,
        Product.sku,
        Product.status,
        Product.created_at,
        Product.updated_at,
    )
    count_q = select(func.count()).select_from(Product)

    if search:
        like = f"%{search}%"
        base = base.where(Product.name.ilike(like))
        count_q = count_q.where(Product.name.ilike(like))
    if category:
        base = base.where(Product.category == category)
        count_q = count_q.where(Product.category == category)
    if status:
        base = base.where(Product.status == status)
        count_q = count_q.where(Product.status == status)
    if price_min is not None:
        base = base.where(Product.price >= price_min)
        count_q = count_q.where(Product.price >= price_min)
    if price_max is not None:
        base = base.where(Product.price <= price_max)
        count_q = count_q.where(Product.price <= price_max)

    base = base.order_by(direction(sort_col))
    base = base.limit(page_size).offset((page - 1) * page_size)

    total = (await db.execute(count_q)).scalar_one()
    rows = (await db.execute(base)).all()

    data = [
        {
            "id": str(r.id),
            "name": r.name,
            "category": r.category,
            "price": float(r.price),
            "stock": r.stock,
            "sku": r.sku,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat(),
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


@router.get("/meta", response_model=ProductMeta)
async def product_meta(db: AsyncSession = Depends(get_db)):
    cache_key = await make_cache_key("products:meta", {})
    cached = await get_cache(cache_key)
    if cached is not None:
        return json.loads(cached)

    cat_rows = await db.execute(
        select(Product.category).distinct().order_by(Product.category)
    )
    status_rows = await db.execute(
        select(Product.status).distinct().order_by(Product.status)
    )
    categories = [r[0] for r in cat_rows.all()]
    statuses = [r[0] for r in status_rows.all()]

    payload = {"categories": categories, "statuses": statuses}
    await set_cache(cache_key, json.dumps(payload), ttl=300)
    return payload


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Product.id,
            Product.name,
            Product.category,
            Product.price,
            Product.stock,
            Product.sku,
            Product.status,
            Product.created_at,
            Product.updated_at,
        ).where(Product.id == product_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return jsonable_encoder(
        {
            "id": row.id,
            "name": row.name,
            "category": row.category,
            "price": float(row.price),
            "stock": row.stock,
            "sku": row.sku,
            "status": row.status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
    )

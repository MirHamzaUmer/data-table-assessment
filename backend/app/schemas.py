from datetime import datetime
from decimal import Decimal
from typing import Generic, List, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


T = TypeVar("T")


class ProductBase(BaseModel):
    name: str
    category: str
    price: Decimal
    stock: int
    sku: str
    status: str


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    role: str
    created_at: datetime


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    total: Decimal
    status: str
    created_at: datetime


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class Paginated(BaseModel, Generic[T]):
    data: List[T]
    pagination: PaginationMeta
    query_time_ms: float = Field(..., description="Server-side query time in ms")


class ProductMeta(BaseModel):
    categories: List[str]
    statuses: List[str]

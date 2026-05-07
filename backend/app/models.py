from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False, index=True)
    stock = Column(Integer, nullable=False)
    sku = Column(String(50), unique=True, nullable=False)
    status = Column(String(20), nullable=False, server_default="active", index=True)
    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_products_created_at", created_at.desc()),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    role = Column(String(50), nullable=False)
    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id"),
        nullable=True,
    )
    total = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), nullable=False, server_default="pending", index=True)
    created_at = Column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

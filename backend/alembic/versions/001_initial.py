"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    op.create_table(
        "products",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False),
        sa.Column("sku", sa.String(length=50), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "orders",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id"),
            nullable=True,
        ),
        sa.Column("total", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index("idx_products_category", "products", ["category"])
    op.create_index("idx_products_status", "products", ["status"])
    op.create_index("idx_products_price", "products", ["price"])
    op.execute(
        "CREATE INDEX idx_products_created_at ON products (created_at DESC);"
    )
    op.create_index(
        "idx_products_sku", "products", ["sku"], unique=True
    )
    op.execute(
        "CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);"
    )

    op.create_index("idx_users_email", "users", ["email"], unique=True)

    op.create_index("idx_orders_user_id", "orders", ["user_id"])
    op.create_index("idx_orders_status", "orders", ["status"])


def downgrade() -> None:
    op.drop_index("idx_orders_status", table_name="orders")
    op.drop_index("idx_orders_user_id", table_name="orders")
    op.drop_index("idx_users_email", table_name="users")
    op.execute("DROP INDEX IF EXISTS idx_products_name_trgm;")
    op.drop_index("idx_products_sku", table_name="products")
    op.execute("DROP INDEX IF EXISTS idx_products_created_at;")
    op.drop_index("idx_products_price", table_name="products")
    op.drop_index("idx_products_status", table_name="products")
    op.drop_index("idx_products_category", table_name="products")

    op.drop_table("orders")
    op.drop_table("users")
    op.drop_table("products")

import asyncio
import random
from decimal import Decimal

import asyncpg
from faker import Faker

from app.config import settings


CATEGORIES = [
    "Electronics",
    "Clothing",
    "Home & Garden",
    "Sports",
    "Books",
    "Toys",
    "Beauty",
    "Automotive",
    "Food",
    "Office",
]

STATUS_WEIGHTED = ["active", "active", "active", "inactive", "discontinued"]
USER_ROLES = ["customer", "customer", "customer", "admin", "manager"]
ORDER_STATUSES = ["pending", "completed", "completed", "cancelled", "shipped"]

NUM_PRODUCTS = 100_000
NUM_USERS = 50_000
NUM_ORDERS = 200_000
PROGRESS_EVERY = 10_000


def _asyncpg_dsn() -> str:
    return (
        f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )


def _generate_product(i: int, fake: Faker) -> tuple:
    name = f"{fake.word().capitalize()} {fake.word().capitalize()}"
    category = random.choice(CATEGORIES)
    price = Decimal(f"{random.uniform(1.99, 999.99):.2f}")
    stock = random.randint(0, 500)
    sku = f"SKU-{i:07d}"
    status = random.choice(STATUS_WEIGHTED)
    return (name, category, price, stock, sku, status)


def _generate_user(i: int, fake: Faker) -> tuple:
    name = fake.name()
    email = f"user{i:06d}+{fake.user_name()}@example.com"
    role = random.choice(USER_ROLES)
    return (name, email, role)


def _generate_order(user_id, product_id) -> tuple:
    total = Decimal(f"{random.uniform(5.0, 2500.0):.2f}")
    status = random.choice(ORDER_STATUSES)
    return (user_id, product_id, total, status)


async def seed() -> None:
    conn = await asyncpg.connect(dsn=_asyncpg_dsn())
    try:
        existing = await conn.fetchval("SELECT COUNT(*) FROM products;")
        if existing and existing > 0:
            print("Already seeded, skipping.")
            return

        fake = Faker()
        Faker.seed(42)
        random.seed(42)

        print(f">>> Inserting {NUM_PRODUCTS} products...")
        product_rows = []
        for i in range(1, NUM_PRODUCTS + 1):
            product_rows.append(_generate_product(i, fake))
            if i % PROGRESS_EVERY == 0:
                print(f"    products generated: {i}/{NUM_PRODUCTS}")

        await conn.executemany(
            """
            INSERT INTO products (name, category, price, stock, sku, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            product_rows,
        )
        print(f"    inserted {NUM_PRODUCTS} products.")

        product_ids = [
            row["id"]
            for row in await conn.fetch("SELECT id FROM products;")
        ]

        print(f">>> Inserting {NUM_USERS} users...")
        user_rows = []
        for i in range(1, NUM_USERS + 1):
            user_rows.append(_generate_user(i, fake))
            if i % PROGRESS_EVERY == 0:
                print(f"    users generated: {i}/{NUM_USERS}")

        await conn.executemany(
            """
            INSERT INTO users (name, email, role)
            VALUES ($1, $2, $3)
            """,
            user_rows,
        )
        print(f"    inserted {NUM_USERS} users.")

        user_ids = [
            row["id"]
            for row in await conn.fetch("SELECT id FROM users;")
        ]

        print(f">>> Inserting {NUM_ORDERS} orders...")
        order_rows = []
        for i in range(1, NUM_ORDERS + 1):
            uid = random.choice(user_ids)
            pid = random.choice(product_ids) if random.random() > 0.05 else None
            order_rows.append(_generate_order(uid, pid))
            if i % PROGRESS_EVERY == 0:
                print(f"    orders generated: {i}/{NUM_ORDERS}")

        await conn.executemany(
            """
            INSERT INTO orders (user_id, product_id, total, status)
            VALUES ($1, $2, $3, $4)
            """,
            order_rows,
        )
        print(f"    inserted {NUM_ORDERS} orders.")

        print("Seeding complete.")
    finally:
        await conn.close()


async def main() -> None:
    await seed()


if __name__ == "__main__":
    asyncio.run(main())

# Project Build Instructions

You are an expert full-stack engineer. Read this entire file first, then build the complete project exactly as described. Do not ask clarifying questions. Do not skip any step. Implement everything fully — no placeholder comments, no TODOs, no stub functions.

---

## What You Are Building

A high-performance data table application that handles 100,000+ records with sub-100ms API responses and smooth virtual scrolling on the frontend.

---

## Tech Stack

- **Backend:** FastAPI (Python 3.11, fully async)
- **Frontend:** NextJS 14 with TypeScript (strict mode)
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Orchestration:** Docker Compose — `docker compose up --build` starts everything with zero manual steps

---

## Project Structure to Create

Create every file listed below. Do not leave any file empty.

```
project-root/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── entrypoint.sh
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 001_initial.py
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── cache.py
│       ├── seed.py
│       └── routers/
│           ├── __init__.py
│           ├── products.py
│           ├── users.py
│           └── orders.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── components.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   └── products/
        │       └── [id]/
        │           └── page.tsx
        ├── components/
        │   ├── DataTable/
        │   │   ├── DataTable.tsx
        │   │   ├── VirtualTable.tsx
        │   │   ├── TableToolbar.tsx
        │   │   └── ColumnHeader.tsx
        │   ├── ui/
        │   │   ├── skeleton.tsx
        │   │   ├── badge.tsx
        │   │   ├── button.tsx
        │   │   ├── input.tsx
        │   │   └── select.tsx
        │   └── ProductDetail.tsx
        ├── hooks/
        │   ├── useProducts.ts
        │   └── useDebounce.ts
        └── lib/
            ├── api.ts
            ├── types.ts
            └── utils.ts
```

---

## Step 1 — Root Files

### `.env.example`
```
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=appdb
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppassword
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql+asyncpg://appuser:apppassword@postgres:5432/appdb
NEXT_PUBLIC_API_URL=http://localhost:8000
INTERNAL_API_URL=http://backend:8000
```

### `.gitignore`
Include: `__pycache__`, `.env`, `venv/`, `.next/`, `node_modules/`, `*.pyc`, `.DS_Store`

### `docker-compose.yml`

Create 4 services:

**postgres:**
- image: postgres:16-alpine
- environment: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD from .env
- volumes: postgres_data:/var/lib/postgresql/data
- healthcheck: `pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB` every 5s, 3 retries

**redis:**
- image: redis:7-alpine
- healthcheck: `redis-cli ping` every 5s

**backend:**
- build: ./backend
- ports: "8000:8000"
- env_file: .env
- depends_on: postgres (condition: service_healthy), redis (condition: service_healthy)
- volumes: ./backend:/app (for dev hot reload)

**frontend:**
- build: ./frontend
- ports: "3000:3000"
- environment: NEXT_PUBLIC_API_URL, INTERNAL_API_URL
- depends_on: backend

All services on bridge network named `app-network`.
Add named volume: `postgres_data`.

---

## Step 2 — Backend

### `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
```

### `backend/requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.30.1
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1
redis==5.0.4
faker==25.0.0
python-dotenv==1.0.1
pydantic-settings==2.2.1
httpx==0.27.0
```

### `backend/entrypoint.sh`
```bash
#!/bin/bash
set -e
echo ">>> Waiting for PostgreSQL..."
until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  sleep 1
done
echo ">>> Running migrations..."
alembic upgrade head
echo ">>> Seeding database..."
python -m app.seed
echo ">>> Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

### `backend/app/config.py`
Use pydantic-settings BaseSettings. Read all env vars from .env. Expose: DATABASE_URL, REDIS_URL, POSTGRES_HOST, POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD.

### `backend/app/database.py`
- Create async SQLAlchemy engine using DATABASE_URL from config
- Connection pool: pool_size=10, max_overflow=20
- Create AsyncSessionLocal using async_sessionmaker
- Create Base = declarative_base()
- Create `get_db()` dependency that yields AsyncSession

### `backend/app/models.py`

Create 3 models:

**Product:**
- id: UUID primary key, server_default=uuid_generate_v4()
- name: String(200), nullable=False
- category: String(100), nullable=False, Index
- price: Numeric(10,2), nullable=False, Index
- stock: Integer, nullable=False
- sku: String(50), unique=True, nullable=False
- status: String(20), nullable=False, default='active', Index
- created_at: DateTime, server_default=func.now(), Index (desc)
- updated_at: DateTime, server_default=func.now(), onupdate=func.now()

**User:**
- id: UUID primary key
- name: String(200)
- email: String(200), unique=True, Index
- role: String(50)
- created_at: DateTime, server_default=func.now()

**Order:**
- id: UUID primary key
- user_id: UUID ForeignKey("users.id")
- product_id: UUID ForeignKey("products.id"), nullable=True
- total: Numeric(10,2)
- status: String(20), default='pending'
- created_at: DateTime, server_default=func.now()

### `backend/alembic/versions/001_initial.py`

The migration must:
1. `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
2. `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
3. Create all 3 tables (products, users, orders) with all columns and constraints
4. Create all indexes:
   - `idx_products_category` on products(category)
   - `idx_products_status` on products(status)
   - `idx_products_price` on products(price)
   - `idx_products_created_at` on products(created_at DESC)
   - `idx_products_sku` unique on products(sku)
   - `idx_products_name_trgm` GIN index: `CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);`
   - `idx_users_email` unique on users(email)
   - `idx_orders_user_id` on orders(user_id)
   - `idx_orders_status` on orders(status)

### `backend/app/seed.py`

Create async seed function:
- Check if products table already has rows — if count > 0, print "Already seeded, skipping." and return immediately (idempotent)
- Use Faker to generate data
- Use asyncpg directly (not SQLAlchemy) for bulk COPY — it is 10x faster
- Insert 100,000 products with realistic data:
  - name: faker.ecommerce product names or `faker.word() + " " + faker.word()`
  - category: randomly pick from this fixed list: ["Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Toys", "Beauty", "Automotive", "Food", "Office"]
  - price: random between 1.99 and 999.99
  - stock: random between 0 and 500
  - sku: unique string like f"SKU-{i:07d}"
  - status: randomly pick from ["active", "active", "active", "inactive", "discontinued"] (weight active more)
- Insert 50,000 users
- Insert 200,000 orders referencing random user_ids
- Print progress every 10,000 rows
- Print "Seeding complete." when done

Run with: `if __name__ == "__main__": asyncio.run(main())`
Also callable as a module: define a `seed()` async function and call it from `__main__`

### `backend/app/cache.py`

- Create Redis client using REDIS_URL from config
- `async def get_cache(key: str) -> str | None` — returns cached JSON string or None
- `async def set_cache(key: str, value: str, ttl: int = 60)` — stores JSON string
- `async def make_cache_key(prefix: str, params: dict) -> str` — returns `f"{prefix}:{md5(sorted params)}"

### `backend/app/schemas.py`

Create Pydantic v2 schemas:

**ProductBase:** name, category, price, stock, sku, status
**ProductResponse:** extends ProductBase + id (UUID), created_at, updated_at. Config: from_attributes=True
**UserResponse:** id, name, email, role, created_at
**OrderResponse:** id, user_id, total, status, created_at

**PaginationMeta:** page, page_size, total, total_pages

**Paginated[T]:** Generic — data: list[T], pagination: PaginationMeta, query_time_ms: float

**ProductMeta:** categories: list[str], statuses: list[str]

### `backend/app/main.py`

- Create FastAPI app with title, description, version
- Add GZipMiddleware (minimum_size=1000)
- Add CORS middleware allowing all origins (for dev)
- Include routers: products (prefix="/api/products"), users (prefix="/api/users"), orders (prefix="/api/orders")
- Add `GET /health` endpoint returning `{"status": "ok", "timestamp": datetime.now().isoformat()}`
- Add startup event that tests DB and Redis connections

### `backend/app/routers/products.py`

**`GET /` (list products)**

Accept query params:
- page: int = 1
- page_size: int = Query(default=50, le=200)
- search: str | None = None
- category: str | None = None
- status: str | None = None
- sort_by: str = "created_at"
- sort_order: str = "desc"
- price_min: float | None = None
- price_max: float | None = None

Logic:
1. Build cache key from all params
2. Check Redis cache — if hit, return cached response immediately
3. Start timer
4. Build SQLAlchemy async query:
   - SELECT only needed columns (id, name, category, price, stock, sku, status, created_at, updated_at)
   - Apply search: if search param, use `Product.name.ilike(f"%{search}%")` with pg_trgm (fast because of gin index)
   - Apply category, status, price_min, price_max filters
   - Validate sort_by is a valid column name (whitelist)
   - Apply ORDER BY
   - Run COUNT query for total (same filters, no pagination)
   - Apply LIMIT/OFFSET for pagination
5. Build response with data, pagination, query_time_ms
6. Store in Redis (TTL 60s)
7. Return response

**`GET /meta`**

Return distinct categories and statuses from products table. Cache for 300s.

**`GET /{product_id}`**

Return single product by UUID. 404 if not found. Do NOT cache individual items.

### `backend/app/routers/users.py`
Same pagination pattern as products. Support sort_by, sort_order, page, page_size. No search needed.

### `backend/app/routers/orders.py`
Same pagination pattern. Support sort_by, sort_order, page, page_size, status filter.

---

## Step 3 — Frontend

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### `frontend/package.json`

Include these dependencies:
```json
{
  "dependencies": {
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "@tanstack/react-query": "^5.40.0",
    "@tanstack/react-virtual": "^3.5.0",
    "nuqs": "^1.17.6",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "eslint": "^8",
    "eslint-config-next": "14.2.3"
  }
}
```

### `frontend/next.config.ts`
Enable React strict mode. Configure rewrites so `/api/*` in dev proxies to `http://localhost:8000/api/*`.

### `frontend/src/lib/types.ts`

```typescript
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  query_time_ms: number;
}

export interface ProductMeta {
  categories: string[];
  statuses: string[];
}

export interface ProductFilters {
  search: string;
  category: string;
  status: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  price_min: string;
  price_max: string;
  page: number;
}
```

### `frontend/src/lib/api.ts`

Create typed API functions:
- `fetchProducts(filters: Partial<ProductFilters>): Promise<PaginatedResponse<Product>>`
- `fetchProduct(id: string): Promise<Product>`
- `fetchProductMeta(): Promise<ProductMeta>`

Use `NEXT_PUBLIC_API_URL` env var as base URL. All functions throw on non-200 responses.

### `frontend/src/hooks/useDebounce.ts`

Standard debounce hook with configurable delay. Return debounced value.

### `frontend/src/hooks/useProducts.ts`

Use React Query:
- `useProducts(filters)` — calls fetchProducts, queryKey includes all filters, staleTime: 30000
- `useProduct(id)` — calls fetchProduct, queryKey: ['product', id]
- `useProductMeta()` — calls fetchProductMeta, staleTime: 300000

### `frontend/src/app/layout.tsx`

- Wrap app with React Query provider (QueryClient with retry: 1)
- Wrap with NuqsAdapter for URL state
- Include Tailwind CSS globals
- Set metadata: title "DataTable", description

### `frontend/src/app/page.tsx`

Main page — render `<DataTable />` component. Add a simple header with app name and a brief description.

### `frontend/src/components/DataTable/TableToolbar.tsx`

Props: onFiltersChange, meta (ProductMeta), totalResults, filteredResults, isLoading

Render:
- Search input (placeholder "Search products...") — debounced 300ms via useDebounce
- Category select dropdown (all options from meta.categories + "All Categories")
- Status select dropdown (meta.statuses + "All Statuses")
- Price min input (number, placeholder "Min price")
- Price max input (number, placeholder "Max price")
- "Clear Filters" button — only visible when any filter is active
- Results count: "Showing {filteredResults} of {totalResults} products"
- Query time badge: "{query_time_ms}ms"

All filter values sync to URL params using nuqs `useQueryState`. This makes filters shareable and browser-back compatible.

### `frontend/src/components/DataTable/ColumnHeader.tsx`

Props: label, sortKey, currentSortBy, currentSortOrder, onSort

Render a clickable header cell. Show up/down arrow icon based on current sort state. Toggle asc/desc on click.

### `frontend/src/components/DataTable/VirtualTable.tsx`

This is the core performance component.

- Accept: `data: Product[]`, `isLoading: boolean`, `onRowClick: (id: string) => void`
- Use `useVirtualizer` from @tanstack/react-virtual
- Container ref with `overflow-y: auto`, fixed height (e.g. `calc(100vh - 200px)`)
- `estimateSize: () => 48` (48px row height)
- `overscan: 10`
- Render only virtualItems — position rows absolutely using `translateY(${item.start}px)`
- Set `paddingTop` and `paddingBottom` on the inner container to account for unrendered rows
- Show loading skeleton rows (10 rows of animated pulse skeletons) when isLoading is true
- Columns: Name, SKU, Category, Price (formatted as currency), Stock, Status (as colored badge), Created At (formatted date)
- Status badge colors: active=green, inactive=yellow, discontinued=red
- Row hover: subtle background change
- Cursor pointer on rows

### `frontend/src/components/DataTable/DataTable.tsx`

Main orchestrating component:
- Use nuqs `useQueryState` for all filter params (search, category, status, sort_by, sort_order, price_min, price_max, page)
- Use `useProducts(filters)` hook
- Prefetch next page using React Query prefetchQuery when current data loads
- Render `<TableToolbar />` + `<VirtualTable />`
- On filter change: show overlay spinner on top of table, keep existing data visible (no flash to empty)
- On error: show error card with message and "Retry" button
- On empty results: show centered message "No products found" with "Clear filters" link

### `frontend/src/app/products/[id]/page.tsx`

- Use `useProduct(id)` hook
- Loading state: show skeleton layout matching the exact card structure
- Error / not found: show 404 message with back link
- Render product detail card:
  - Product name as large heading
  - SKU as muted subheading
  - Status badge (colored)
  - Grid of: Price, Stock, Category, Created At
  - Full width separator
  - "Related Products" section — fetch products with same category, limit 5, show as small cards
  - Breadcrumb at top: "Products > {product name}"
  - Back button

### `frontend/src/app/globals.css`

Standard Tailwind base/components/utilities. Add custom scrollbar styles for the virtual table container.

---

## Step 4 — README.md

Write a comprehensive README at the project root with these sections:

1. **Quick Start** — `git clone`, `cp .env.example .env`, `docker compose up --build`, open localhost:3000. Note: wait ~30s for seeding.
2. **Architecture** — describe the 4 services and how they communicate
3. **Performance Optimizations** — list every optimization implemented (Redis cache, pg_trgm, virtual scroll, etc.)
4. **API Documentation** — table of all endpoints with params
5. **What I Would Improve With More Time** — 2 honest paragraphs about keyset pagination for deep pages, Elasticsearch for search, WebSocket live updates, test coverage

---

## Implementation Order

Build in this exact order so each step compiles and works before the next:

1. Root files: `.env.example`, `.gitignore`, `docker-compose.yml`
2. Backend: `requirements.txt`, `Dockerfile`, `entrypoint.sh`
3. Backend: `config.py`, `database.py`, `models.py`
4. Backend: Alembic migration `001_initial.py`
5. Backend: `seed.py`
6. Backend: `cache.py`, `schemas.py`
7. Backend: `main.py`, all 3 routers
8. Frontend: `package.json`, `next.config.ts`, `tsconfig.json`
9. Frontend: `lib/types.ts`, `lib/api.ts`, `lib/utils.ts`
10. Frontend: `hooks/useDebounce.ts`, `hooks/useProducts.ts`
11. Frontend: `components/ui/` — all shadcn-style base components
12. Frontend: `components/DataTable/` — all 4 components
13. Frontend: `components/ProductDetail.tsx`
14. Frontend: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
15. Frontend: `app/products/[id]/page.tsx`
16. `README.md`

---

## Quality Requirements

- Every file must be complete and working — no stubs
- TypeScript strict mode — no `any` types
- All async functions must have proper error handling
- Backend: never use `SELECT *` — always select specific columns
- Backend: all endpoints must respond in under 100ms (Redis cache ensures this for repeated queries)
- Frontend: no layout shift during loading — skeleton must match real content dimensions exactly
- Docker: `docker compose up --build` from a fresh clone must work with zero errors

Begin now. Create all files in order.

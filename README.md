# DataTable Assessment

A high-performance data table application that handles 100,000+ records with sub-100ms API responses and smooth virtual scrolling.

---

## Quick Start

```bash
git clone <this-repo>
cd data-table-assessment
cp .env.example .env
docker compose up --build
```

Then open http://localhost:3000.

> **Note:** First boot takes ~30 seconds because the backend runs migrations and seeds 100k products + 50k users + 200k orders before serving traffic. Subsequent boots are instant — seeding is idempotent.

Endpoints:

- Frontend: http://localhost:3000
- API:      http://localhost:8000
- API docs: http://localhost:8000/docs
- Health:   http://localhost:8000/health

---

## Architecture

Four containers wired together by Docker Compose on a private bridge network:

| Service    | Image / Build       | Port  | Role                                                             |
|------------|---------------------|-------|------------------------------------------------------------------|
| `postgres` | `postgres:16-alpine`| —     | Primary store. `uuid-ossp` and `pg_trgm` extensions enabled.     |
| `redis`    | `redis:7-alpine`    | —     | Caches list responses (60s TTL) and meta lookups (300s TTL).      |
| `backend`  | `./backend`         | 8000  | FastAPI + async SQLAlchemy. 2 uvicorn workers.                   |
| `frontend` | `./frontend`        | 3000  | Next.js 14 App Router with React Query + virtual scrolling.       |

Boot order: postgres and redis come up first with healthchecks. The backend `entrypoint.sh` waits for postgres, runs Alembic migrations, runs `python -m app.seed` (idempotent), then starts uvicorn. The frontend depends only on the backend service.

The frontend speaks to the backend via `NEXT_PUBLIC_API_URL` (browser) and the dev rewrite in `next.config.mjs` (server). Containers also share `app-network` so server-side rendering can reach the backend via `INTERNAL_API_URL` if needed.

---

## Performance Optimizations

**Database**

- B-tree indexes on every column we filter or sort by: `category`, `status`, `price`, `created_at DESC`, `sku` (unique).
- `pg_trgm` GIN index on `products.name` so `ILIKE '%term%'` searches stay fast even at 100k+ rows.
- Migrations enable `uuid-ossp` so UUIDs are generated server-side (`uuid_generate_v4()`).

**Backend (FastAPI)**

- Fully async stack: `asyncpg` + `SQLAlchemy[asyncio]` for the API, plain `asyncpg` for bulk seeding (~10× faster than ORM inserts).
- Connection pooling: `pool_size=10`, `max_overflow=20`.
- Redis cache for list endpoints (60s TTL) and meta endpoint (300s TTL). Cache key is an MD5 of all query params, so different filter combinations get distinct entries.
- `SELECT` only the columns the response needs — never `SELECT *`.
- Sort key is whitelisted to prevent SQL injection through the `sort_by` param.
- `GZipMiddleware` compresses responses ≥1KB.
- 2 uvicorn workers per container.
- `query_time_ms` is reported on every list response so the impact is visible in the UI badge.

**Frontend (Next.js 14)**

- `@tanstack/react-virtual` virtualizes the rows — only ~20 DOM nodes exist regardless of result size.
- `@tanstack/react-query` caches API responses; `staleTime: 30s` for lists, `300s` for meta. Previous data stays visible during refetch (`placeholderData: prev`) so filter changes don't flash empty.
- `prefetchQuery` warms the next page while the current page is rendered.
- Search input is debounced 300ms via `useDebounce`.
- Filters are stored in URL state via `nuqs` — fully shareable, browser-back compatible, survives reload.
- Skeleton rows match the real row height (48px) exactly, so there is no layout shift when data arrives.
- React strict mode + TypeScript strict mode, no `any`.

---

## API Documentation

| Method | Endpoint                         | Query parameters                                                                                                          | Notes                                  |
|--------|----------------------------------|---------------------------------------------------------------------------------------------------------------------------|----------------------------------------|
| GET    | `/health`                        | —                                                                                                                         | Liveness probe.                        |
| GET    | `/api/products/`                 | `page`, `page_size` (≤200), `search`, `category`, `status`, `sort_by`, `sort_order`, `price_min`, `price_max`             | Paginated list. Cached 60s in Redis.   |
| GET    | `/api/products/meta`             | —                                                                                                                         | Distinct categories + statuses. Cached 300s. |
| GET    | `/api/products/{product_id}`     | —                                                                                                                         | Single product by UUID. Not cached.    |
| GET    | `/api/users/`                    | `page`, `page_size`, `sort_by`, `sort_order`, `role`                                                                      | Paginated list. Cached 60s.            |
| GET    | `/api/orders/`                   | `page`, `page_size`, `sort_by`, `sort_order`, `status`                                                                    | Paginated list. Cached 60s.            |

All list responses share this shape:

```json
{
  "data": [ /* records */ ],
  "pagination": { "page": 1, "page_size": 100, "total": 100000, "total_pages": 1000 },
  "query_time_ms": 12.34
}
```

Interactive Swagger / OpenAPI docs are available at `http://localhost:8000/docs`.

---

## What I Would Improve With More Time

The current pagination uses `LIMIT/OFFSET`, which is fine for shallow pages but degrades on deep ones because Postgres still has to walk past every skipped row. For a real product I would switch to **keyset (cursor-based) pagination** keyed on `(created_at, id)` — the cost stays constant regardless of depth, and it composes naturally with the existing `created_at DESC` index. I would also push search out of Postgres and into **Elasticsearch / OpenSearch** once the corpus grows past a few million rows, since `pg_trgm` is excellent up to a point but eventually loses to a purpose-built inverted index for ranked, multi-field, fuzzy queries.

On the experience side, list responses are currently polled implicitly through React Query revalidation; I would add **WebSocket / SSE live updates** so that inserts and price/stock changes propagate to every connected table in real time, with React Query's cache being patched in place rather than refetched. Finally, the current code has zero automated tests — I would add **pytest + httpx.AsyncClient** for the API (covering filters, sort whitelisting, cache hits, and 404s), **Playwright** for one end-to-end happy path through the table and detail page, and a small **k6 / Locust** load script that proves the sub-100ms cached-response budget under concurrent load.

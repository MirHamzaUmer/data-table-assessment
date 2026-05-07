import type {
  PaginatedResponse,
  Product,
  ProductFilters,
  ProductMeta,
} from "@/lib/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    search.append(k, String(v));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function jsonFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function fetchProducts(
  filters: Partial<ProductFilters>,
): Promise<PaginatedResponse<Product>> {
  const qs = buildQuery({
    page: filters.page ?? 1,
    page_size: 100,
    search: filters.search,
    category: filters.category,
    status: filters.status,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order,
    price_min: filters.price_min,
    price_max: filters.price_max,
  });
  return jsonFetch<PaginatedResponse<Product>>(`${BASE_URL}/api/products/${qs}`);
}

export async function fetchProduct(id: string): Promise<Product> {
  return jsonFetch<Product>(`${BASE_URL}/api/products/${id}`);
}

export async function fetchProductMeta(): Promise<ProductMeta> {
  return jsonFetch<ProductMeta>(`${BASE_URL}/api/products/meta`);
}

export async function fetchRelatedProducts(
  category: string,
  excludeId: string,
): Promise<Product[]> {
  const qs = buildQuery({
    category,
    page: 1,
    page_size: 6,
    sort_by: "created_at",
    sort_order: "desc",
  });
  const res = await jsonFetch<PaginatedResponse<Product>>(
    `${BASE_URL}/api/products/${qs}`,
  );
  return res.data.filter((p) => p.id !== excludeId).slice(0, 5);
}

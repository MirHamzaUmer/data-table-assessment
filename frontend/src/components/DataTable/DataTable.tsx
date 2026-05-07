"use client";

import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  usePrefetchProducts,
  useProductMeta,
  useProducts,
} from "@/hooks/useProducts";
import type { ProductFilters } from "@/lib/types";

import { TableToolbar, type ToolbarFilters } from "./TableToolbar";
import { VirtualTable } from "./VirtualTable";

const DEFAULT_SORT_BY = "created_at";
const DEFAULT_SORT_ORDER: "asc" | "desc" = "desc";

export function DataTable() {
  const router = useRouter();

  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [category, setCategory] = useQueryState(
    "category",
    parseAsString.withDefault(""),
  );
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault(""),
  );
  const [sortBy, setSortBy] = useQueryState(
    "sort_by",
    parseAsString.withDefault(DEFAULT_SORT_BY),
  );
  const [sortOrder, setSortOrder] = useQueryState(
    "sort_order",
    parseAsString.withDefault(DEFAULT_SORT_ORDER),
  );
  const [priceMin, setPriceMin] = useQueryState(
    "price_min",
    parseAsString.withDefault(""),
  );
  const [priceMax, setPriceMax] = useQueryState(
    "price_max",
    parseAsString.withDefault(""),
  );
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1),
  );

  const filters: Partial<ProductFilters> = useMemo(
    () => ({
      search,
      category,
      status,
      sort_by: sortBy,
      sort_order: (sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc",
      price_min: priceMin,
      price_max: priceMax,
      page,
    }),
    [search, category, status, sortBy, sortOrder, priceMin, priceMax, page],
  );

  const { data, error, isLoading, isFetching, refetch } = useProducts(filters);
  const { data: meta } = useProductMeta();
  const prefetch = usePrefetchProducts();

  useEffect(() => {
    if (data && data.pagination.page < data.pagination.total_pages) {
      prefetch({ ...filters, page: data.pagination.page + 1 });
    }
  }, [data, filters, prefetch]);

  function handleFiltersChange(next: Partial<ToolbarFilters>) {
    if (next.search !== undefined) void setSearch(next.search || null);
    if (next.category !== undefined) void setCategory(next.category || null);
    if (next.status !== undefined) void setStatus(next.status || null);
    if (next.price_min !== undefined)
      void setPriceMin(next.price_min || null);
    if (next.price_max !== undefined)
      void setPriceMax(next.price_max || null);
    void setPage(null);
  }

  function handleSort(key: string, order: "asc" | "desc") {
    void setSortBy(key === DEFAULT_SORT_BY ? null : key);
    void setSortOrder(order === DEFAULT_SORT_ORDER ? null : order);
  }

  function handleRowClick(id: string) {
    router.push(`/products/${id}`);
  }

  function clearAll() {
    void setSearch(null);
    void setCategory(null);
    void setStatus(null);
    void setPriceMin(null);
    void setPriceMax(null);
    void setPage(null);
  }

  const toolbarFilters: ToolbarFilters = {
    search,
    category,
    status,
    price_min: priceMin,
    price_max: priceMax,
  };

  return (
    <div className="relative flex flex-col gap-4">
      <TableToolbar
        filters={toolbarFilters}
        onFiltersChange={handleFiltersChange}
        meta={meta}
        totalResults={data?.pagination.total}
        filteredResults={data?.data.length}
        isLoading={isLoading || isFetching}
        queryTimeMs={data?.query_time_ms}
      />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p className="mb-3 font-medium">Failed to load products.</p>
          <p className="mb-4 text-sm">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-medium text-slate-900">
            No products found
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-2 text-sm text-slate-600 underline hover:text-slate-900"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="relative">
          <VirtualTable
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            sortBy={sortBy}
            sortOrder={sortOrder === "asc" ? "asc" : "desc"}
            onSort={handleSort}
          />
          {isFetching && data && data.data.length > 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-4">
              <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow ring-1 ring-slate-200">
                Updating…
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

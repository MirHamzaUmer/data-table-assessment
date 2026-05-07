"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/lib/types";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";

import { ColumnHeader } from "./ColumnHeader";

const ROW_HEIGHT = 48;

const COLUMN_GRID =
  "grid grid-cols-[2fr_1fr_1fr_1fr_0.7fr_1fr_1fr] gap-3 px-4";

interface VirtualTableProps {
  data: Product[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (key: string, order: "asc" | "desc") => void;
}

function statusVariant(status: Product["status"]) {
  if (status === "active") return "success" as const;
  if (status === "inactive") return "warning" as const;
  return "danger" as const;
}

export function VirtualTable({
  data,
  isLoading,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
}: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0 ? totalSize - items[items.length - 1].end : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div
        className={cn(
          COLUMN_GRID,
          "h-10 items-center border-b border-slate-200 bg-slate-50",
        )}
      >
        <ColumnHeader
          label="Name"
          sortKey="name"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
        <ColumnHeader
          label="SKU"
          sortKey="sku"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
        <ColumnHeader
          label="Category"
          sortKey="category"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
        <ColumnHeader
          label="Price"
          sortKey="price"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
        <ColumnHeader
          label="Stock"
          sortKey="stock"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
        <ColumnHeader
          label="Status"
          sortKey="status"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
        <ColumnHeader
          label="Created"
          sortKey="created_at"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
      </div>

      {isLoading && data.length === 0 ? (
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={cn(COLUMN_GRID, "items-center")}
              style={{ height: ROW_HEIGHT }}
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={parentRef}
          className="datatable-scroll relative overflow-y-auto"
          style={{ height: "calc(100vh - 280px)" }}
        >
          <div style={{ paddingTop, paddingBottom }}>
            {items.map((vItem) => {
              const product = data[vItem.index];
              return (
                <div
                  key={product.id}
                  className={cn(
                    COLUMN_GRID,
                    "cursor-pointer items-center border-b border-slate-100 text-sm text-slate-700 hover:bg-slate-50",
                  )}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => onRowClick(product.id)}
                >
                  <div className="truncate font-medium text-slate-900">
                    {product.name}
                  </div>
                  <div className="truncate font-mono text-xs text-slate-500">
                    {product.sku}
                  </div>
                  <div className="truncate">{product.category}</div>
                  <div className="tabular-nums">
                    {formatCurrency(product.price)}
                  </div>
                  <div className="tabular-nums">
                    {formatNumber(product.stock)}
                  </div>
                  <div>
                    <Badge variant={statusVariant(product.status)}>
                      {product.status}
                    </Badge>
                  </div>
                  <div className="text-slate-500">
                    {formatDate(product.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

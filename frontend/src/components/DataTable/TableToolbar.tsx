"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import type { ProductMeta } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export interface ToolbarFilters {
  search: string;
  category: string;
  status: string;
  price_min: string;
  price_max: string;
}

export interface TableToolbarProps {
  filters: ToolbarFilters;
  onFiltersChange: (next: Partial<ToolbarFilters>) => void;
  meta: ProductMeta | undefined;
  totalResults: number | undefined;
  filteredResults: number | undefined;
  isLoading: boolean;
  queryTimeMs: number | undefined;
}

export function TableToolbar({
  filters,
  onFiltersChange,
  meta,
  totalResults,
  filteredResults,
  isLoading,
  queryTimeMs,
}: TableToolbarProps) {
  const [searchLocal, setSearchLocal] = useState(filters.search);
  const debouncedSearch = useDebounce(searchLocal, 300);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, onFiltersChange]);

  useEffect(() => {
    setSearchLocal(filters.search);
  }, [filters.search]);

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.category) ||
    Boolean(filters.status) ||
    Boolean(filters.price_min) ||
    Boolean(filters.price_max);

  function clearFilters() {
    setSearchLocal("");
    onFiltersChange({
      search: "",
      category: "",
      status: "",
      price_min: "",
      price_max: "",
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
        <div className="md:col-span-2">
          <Input
            placeholder="Search products..."
            value={searchLocal}
            onChange={(e) => setSearchLocal(e.target.value)}
          />
        </div>
        <Select
          value={filters.category}
          onChange={(e) => onFiltersChange({ category: e.target.value })}
        >
          <option value="">All Categories</option>
          {meta?.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={filters.status}
          onChange={(e) => onFiltersChange({ status: e.target.value })}
        >
          <option value="">All Statuses</option>
          {meta?.statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          placeholder="Min price"
          value={filters.price_min}
          onChange={(e) => onFiltersChange({ price_min: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Max price"
          value={filters.price_max}
          onChange={(e) => onFiltersChange({ price_max: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {formatNumber(filteredResults ?? 0)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {formatNumber(totalResults ?? 0)}
            </span>{" "}
            products
          </span>
          {queryTimeMs !== undefined && (
            <Badge variant="muted">{queryTimeMs}ms</Badge>
          )}
          {isLoading && <Badge variant="default">Loading…</Badge>}
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}

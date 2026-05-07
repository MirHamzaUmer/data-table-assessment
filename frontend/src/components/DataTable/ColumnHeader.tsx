"use client";

import { cn } from "@/lib/utils";

export interface ColumnHeaderProps {
  label: string;
  sortKey: string;
  currentSortBy: string;
  currentSortOrder: "asc" | "desc";
  onSort: (key: string, order: "asc" | "desc") => void;
  className?: string;
}

export function ColumnHeader({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  className,
}: ColumnHeaderProps) {
  const isActive = currentSortBy === sortKey;
  const next: "asc" | "desc" =
    isActive && currentSortOrder === "desc" ? "asc" : "desc";

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey, isActive ? next : "desc")}
      className={cn(
        "inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-900",
        isActive && "text-slate-900",
        className,
      )}
    >
      <span>{label}</span>
      <span className="text-[10px] text-slate-400">
        {isActive ? (currentSortOrder === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

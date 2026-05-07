export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  status: "active" | "inactive" | "discontinued";
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
  sort_order: "asc" | "desc";
  price_min: string;
  price_max: string;
  page: number;
}

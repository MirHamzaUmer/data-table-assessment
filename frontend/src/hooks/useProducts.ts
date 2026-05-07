import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchProduct,
  fetchProductMeta,
  fetchProducts,
  fetchRelatedProducts,
} from "@/lib/api";
import type { ProductFilters } from "@/lib/types";

export function useProducts(filters: Partial<ProductFilters>) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function usePrefetchProducts() {
  const qc = useQueryClient();
  return (filters: Partial<ProductFilters>) =>
    qc.prefetchQuery({
      queryKey: ["products", filters],
      queryFn: () => fetchProducts(filters),
      staleTime: 30_000,
    });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: Boolean(id),
  });
}

export function useProductMeta() {
  return useQuery({
    queryKey: ["product-meta"],
    queryFn: fetchProductMeta,
    staleTime: 300_000,
  });
}

export function useRelatedProducts(category: string | undefined, excludeId: string) {
  return useQuery({
    queryKey: ["related-products", category, excludeId],
    queryFn: () => fetchRelatedProducts(category as string, excludeId),
    enabled: Boolean(category) && Boolean(excludeId),
    staleTime: 60_000,
  });
}

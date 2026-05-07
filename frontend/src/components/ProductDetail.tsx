"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct, useRelatedProducts } from "@/hooks/useProducts";
import type { Product } from "@/lib/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

function statusVariant(status: Product["status"]) {
  if (status === "active") return "success" as const;
  if (status === "inactive") return "warning" as const;
  return "danger" as const;
}

interface DetailGridProps {
  product: Product;
}

function DetailGrid({ product }: DetailGridProps) {
  return (
    <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div>
        <dt className="text-xs font-medium uppercase text-slate-500">Price</dt>
        <dd className="mt-1 text-lg font-semibold text-slate-900">
          {formatCurrency(product.price)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-slate-500">Stock</dt>
        <dd className="mt-1 text-lg font-semibold text-slate-900">
          {formatNumber(product.stock)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-slate-500">
          Category
        </dt>
        <dd className="mt-1 text-lg font-semibold text-slate-900">
          {product.category}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-slate-500">
          Created At
        </dt>
        <dd className="mt-1 text-lg font-semibold text-slate-900">
          {formatDate(product.created_at)}
        </dd>
      </div>
    </dl>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="mb-3 h-8 w-2/3" />
        <Skeleton className="mb-6 h-4 w-1/3" />
        <div className="mb-6">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-3 w-12" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="my-6 h-px w-full bg-slate-200" />
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const { data: product, isLoading, error } = useProduct(productId);
  const { data: related, isLoading: relatedLoading } = useRelatedProducts(
    product?.category,
    productId,
  );

  if (isLoading) return <DetailSkeleton />;

  if (error || !product) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-2xl font-semibold text-slate-900">
          Product not found
        </p>
        <p className="mt-2 text-sm text-slate-500">
          The product you are looking for does not exist or was removed.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-slate-700 underline hover:text-slate-900"
        >
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900">
          Products
        </Link>
        <span>›</span>
        <span className="truncate text-slate-900">{product.name}</span>
      </nav>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {product.name}
            </h1>
            <p className="mt-1 font-mono text-sm text-slate-500">
              {product.sku}
            </p>
            <div className="mt-3">
              <Badge variant={statusVariant(product.status)}>
                {product.status}
              </Badge>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Back
            </Button>
          </Link>
        </div>

        <DetailGrid product={product} />

        <div className="my-6 h-px w-full bg-slate-200" />

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Related Products
          </h2>
          {relatedLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : related && related.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="rounded-md border border-slate-200 p-3 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  <p className="line-clamp-2 text-sm font-medium text-slate-900">
                    {p.name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    {p.sku}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatCurrency(p.price)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No related products in this category.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

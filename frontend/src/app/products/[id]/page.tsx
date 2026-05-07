import { ProductDetail } from "@/components/ProductDetail";

interface PageProps {
  params: { id: string };
}

export default function ProductPage({ params }: PageProps) {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      <ProductDetail productId={params.id} />
    </main>
  );
}

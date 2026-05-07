import { DataTable } from "@/components/DataTable/DataTable";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">DataTable</h1>
        <p className="mt-1 text-sm text-slate-600">
          100,000 products. Filter, sort, and scroll without paging — virtualized
          rendering keeps the UI smooth.
        </p>
      </header>
      <DataTable />
    </main>
  );
}

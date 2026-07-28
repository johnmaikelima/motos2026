import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { dbToProduct } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import SearchInput from "@/components/SearchInput";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Busca" };

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let products: ReturnType<typeof dbToProduct>[] = [];
  if (query.length >= 2) {
    const rows = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query } },
          { brand: { contains: query } },
          { categoria: { contains: query } },
          { subcategoria: { contains: query } },
        ],
      },
      include: { variants: true },
      take: 60,
      orderBy: { name: "asc" },
    });
    products = rows.map(dbToProduct);
  }

  return (
    <div className="container-rm py-10">
      <h1 className="heading-display mb-4 text-4xl text-white">Buscar</h1>
      <div className="mb-8 max-w-xl">
        <SearchInput initial={query} />
      </div>

      {query.length < 2 ? (
        <p className="text-sm text-gray-400">Digite ao menos 2 letras para buscar.</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nenhum produto encontrado para <strong className="text-white">&quot;{query}&quot;</strong>.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-400">
            {products.length} resultado(s) para <strong className="text-white">&quot;{query}&quot;</strong>
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

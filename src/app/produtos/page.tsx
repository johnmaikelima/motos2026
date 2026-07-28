import Link from "next/link";
import type { Metadata } from "next";
import { getAllProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Todos os produtos",
  description: "Catálogo completo de produtos para motociclistas.",
};

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; subcategoria?: string }>;
}) {
  const { categoria, subcategoria } = await searchParams;
  const all = await getAllProducts();

  // Categorias (tipo) presentes no catálogo, com subcategorias.
  const catMap = new Map<string, Set<string>>();
  for (const p of all) {
    if (!p.categoria) continue;
    const subs = catMap.get(p.categoria) ?? new Set<string>();
    if (p.subcategoria) subs.add(p.subcategoria);
    catMap.set(p.categoria, subs);
  }
  const categorias = [...catMap.keys()].sort((a, b) => a.localeCompare(b));
  const subs = categoria ? [...(catMap.get(categoria) ?? new Set())].sort((a, b) => a.localeCompare(b)) : [];

  let products = all;
  if (categoria) products = products.filter((p) => p.categoria === categoria);
  if (subcategoria) products = products.filter((p) => p.subcategoria === subcategoria);

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
      active ? "border-lime bg-lime text-black" : "border-white/15 text-gray-300 hover:border-lime/60"
    }`;

  return (
    <div className="container-rm py-10">
      <header className="mb-6 border-b border-white/5 pb-6">
        <h1 className="heading-display text-4xl text-white">
          {subcategoria || categoria || "Todos os produtos"}
        </h1>
        <p className="mt-2 text-sm text-gray-400">{products.length} produto(s).</p>
      </header>

      {categorias.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/produtos" className={chip(!categoria)}>Todas</Link>
          {categorias.map((c) => (
            <Link key={c} href={`/produtos?categoria=${encodeURIComponent(c)}`} className={chip(categoria === c)}>
              {c}
            </Link>
          ))}
        </div>
      )}

      {/* Subcategorias da categoria selecionada */}
      {categoria && subs.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link href={`/produtos?categoria=${encodeURIComponent(categoria)}`} className={chip(!subcategoria)}>
            Todas de {categoria}
          </Link>
          {subs.map((s) => (
            <Link
              key={s}
              href={`/produtos?categoria=${encodeURIComponent(categoria)}&subcategoria=${encodeURIComponent(s)}`}
              className={chip(subcategoria === s)}
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="py-16 text-center text-gray-400">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

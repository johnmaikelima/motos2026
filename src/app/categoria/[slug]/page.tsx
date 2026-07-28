import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategory, getCategories, getProductsByCategory, getAllProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

// Catálogo é dinâmico (categorias vêm do banco / Laquila).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Categoria" };
  return { title: category.name, description: category.tagline };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [category, categories] = await Promise.all([getCategory(slug), getCategories()]);
  if (!category) notFound();

  let products = await getProductsByCategory(slug);
  // Se a categoria ainda não tem itens mapeados, mostra o catálogo geral.
  if (products.length === 0) products = await getAllProducts();

  return (
    <div className="container-rm py-10">
      <nav className="mb-4 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-lime">Início</Link>
        <span>/</span>
        <span className="text-gray-300">{category.name}</span>
      </nav>

      <header className="mb-8 border-b border-white/5 pb-6">
        <h1 className="heading-display text-4xl text-white">{category.name}</h1>
        <p className="mt-2 text-sm text-gray-400">{category.tagline}</p>
      </header>

      {/* filtro por categoria */}
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/categoria/${c.slug}`}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              c.slug === slug ? "border-lime bg-lime text-black" : "border-white/15 text-gray-300 hover:border-lime/60"
            }`}
          >
            {c.name.replace("Jaquetas ", "")}
          </Link>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

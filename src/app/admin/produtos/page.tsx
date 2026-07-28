import Link from "next/link";
import { prisma } from "@/lib/db";
import ProductsTable, { type AdminProduct } from "@/components/admin/ProductsTable";
import TypeCategoryEditor from "@/components/admin/TypeCategoryEditor";
import ManualProductForm from "@/components/admin/ManualProductForm";
import { isOpenAIConfigured } from "@/lib/openai";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gerenciar produtos" };

const SIZE_ORDER = ["PP","XS","P","S","M","L","G","XL","GG","XXL","2XL","XXXL","3XL","XXXXL","4XL","5XL","6XL"];
function sortSizes(s: string[]) {
  const i = (x: string) => { const n = SIZE_ORDER.indexOf(x.toUpperCase()); return n === -1 ? 999 : n; };
  return [...new Set(s)].sort((a, b) => i(a) - i(b));
}

export default async function ProdutosAdminPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { variants: true },
  });

  const rows: AdminProduct[] = products.map((p) => {
    const estoque = p.variants.reduce((s, v) => s + v.stock, 0);
    const precos = p.variants.map((v) => v.price).filter((n) => n > 0);
    const tamanhos = sortSizes(p.variants.map((v) => v.size ?? "").filter(Boolean));
    // Variação mais barata (a que define o "a partir de") -> custo e tipo de preço.
    const priced = p.variants.filter((v) => v.price > 0);
    const cheapest = priced.length ? priced.reduce((a, b) => (b.price < a.price ? b : a)) : p.variants[0];
    const custo = cheapest?.cost ?? 0;
    // "Sugerido" = a Laquila mandou preço sugerido (>0); senão o preço foi gerado por nós (markup).
    const precoSugerido = !!(cheapest?.valorSugerido && cheapest.valorSugerido > 0);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      rawName: p.rawName,
      brand: p.brand,
      image: p.image,
      color: p.color,
      categoria: p.categoria,
      subcategoria: p.subcategoria,
      variantes: p.variants.length,
      estoque,
      precoMin: precos.length ? Math.min(...precos) : 0,
      custo,
      precoSugerido,
      tamanhos: tamanhos.join(", "),
      active: p.active,
      reviewed: p.reviewed,
    };
  });

  // Árvore de categorias existentes (para edição).
  const catMap = new Map<string, Map<string, number>>();
  for (const p of products) {
    if (!p.categoria) continue;
    const subs = catMap.get(p.categoria) ?? new Map<string, number>();
    const sub = p.subcategoria ?? "—";
    subs.set(sub, (subs.get(sub) ?? 0) + 1);
    catMap.set(p.categoria, subs);
  }
  const categoryTree = [...catMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([categoria, subs]) => ({
      categoria,
      total: [...subs.values()].reduce((s, n) => s + n, 0),
      subs: [...subs.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  const semCategoria = products.filter((p) => !p.categoria).length;

  const totalVariantes = products.reduce((s, p) => s + p.variants.length, 0);
  const ativos = products.filter((p) => p.active).length;
  const aRevisar = products.filter((p) => !p.reviewed).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="heading-display text-3xl text-white">Gerenciar produtos</h1>
          <p className="mt-1 text-sm text-gray-400">
            {products.length} produtos · {totalVariantes} variações · {ativos} ativos · {aRevisar} a revisar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/importar" className="btn-outline">
            Importar / planilha
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <ManualProductForm />
      </div>

      {products.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-gray-400">Nenhum produto salvo ainda. Adicione um manualmente acima ou importe a planilha.</p>
          <Link href="/admin/importar" className="btn-primary">Ir para Importar</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {!isOpenAIConfigured() && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              Para a sugestão por IA, defina <strong>OPENAI_API_KEY</strong> no <strong>.env.local</strong>.
              A atribuição manual de categoria funciona mesmo sem a chave.
            </p>
          )}
          <TypeCategoryEditor tree={categoryTree} semCategoria={semCategoria} />
          <ProductsTable
            products={rows}
            categories={categoryTree.map((c) => ({
              categoria: c.categoria,
              subs: c.subs.map((s) => s.name).filter((n) => n !== "—"),
            }))}
          />
        </div>
      )}
    </div>
  );
}

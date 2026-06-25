import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ProductEditor, { type EditorProduct } from "@/components/admin/ProductEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar produto" };

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { variants: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  if (!product) notFound();

  const editor: EditorProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    categorySlug: product.categorySlug,
    categoria: product.categoria ?? "",
    subcategoria: product.subcategoria ?? "",
    description: product.description,
    descricaoComplementar: product.descricaoComplementar ?? "",
    caracteristicas: product.caracteristicas ?? "",
    image: product.image,
    gallery: product.gallery ? product.gallery.split(",").map((s) => s.trim()).filter(Boolean) : [],
    active: product.active,
    bestSeller: product.bestSeller,
  };

  const variants = product.variants
    .sort((a, b) => (a.size ?? "").localeCompare(b.size ?? ""))
    .map((v) => ({
      id: v.id,
      cdItem: v.cdItem,
      size: v.size ?? "",
      ean: v.ean ?? "",
      cost: v.cost ?? 0,
      price: v.price,
      stock: v.stock,
    }));

  // peso/dimensões: pega da 1ª variação; dimensões guardadas em metros -> exibe em cm.
  const v0 = product.variants[0];
  const shipping = {
    weight: v0?.pesoBruto ?? v0?.pesoLiquido ?? 0,
    length: Math.round((v0?.comprimentoCaixa ?? 0) * 100),
    width: Math.round((v0?.larguraCaixa ?? 0) * 100),
    height: Math.round((v0?.alturaCaixa ?? 0) * 100),
  };

  return (
    <div>
      <h1 className="heading-display mb-6 text-3xl text-white">Editar produto</h1>
      <ProductEditor product={editor} categories={categories} variants={variants} shipping={shipping} />
    </div>
  );
}

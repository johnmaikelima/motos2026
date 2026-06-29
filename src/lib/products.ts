import "server-only";
import type { Product as DbProduct, Variant as DbVariant } from "@prisma/client";
import type { Category, Product } from "./types";
import { installmentsFor } from "./format";
import { prisma } from "./db";

/**
 * Categorias de DEMONSTRAÇÃO.
 * Servem só de "semente" quando ainda não há nada descoberto da Laquila e
 * para a loja não ficar vazia. Cada uma tem um `code` fictício que simula o
 * cd_grupo da Laquila. As categorias REAIS são descobertas dos itens da API
 * (valores distintos de cd_grupo) e ficam na tabela Category.
 */
export const DEMO_CATEGORIES: Category[] = [
  { code: "G10", slug: "impermeaveis", name: "Jaquetas Impermeáveis", tagline: "Enfrente qualquer clima com máxima proteção." },
  { code: "G20", slug: "urbanas", name: "Jaquetas Urbanas", tagline: "Estilo e segurança para o dia a dia." },
  { code: "G30", slug: "turismo", name: "Jaquetas Turismo", tagline: "Conforto em longas jornadas." },
  { code: "G40", slug: "ventiladas", name: "Jaquetas Ventiladas", tagline: "Mais ventilação para os dias quentes." },
];

/** Categorias exibidas na loja: vêm do banco (descobertas). Fallback = demo. */
export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return rows.map((c) => ({
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      code: c.code,
      productCount: c.productCount,
    }));
  } catch (err) {
    console.warn("[categories] erro ao ler categorias:", err);
  }
  return [];
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  try {
    const c = await prisma.category.findUnique({ where: { slug } });
    if (c) return { slug: c.slug, name: c.name, tagline: c.tagline, code: c.code, productCount: c.productCount };
  } catch (err) {
    console.warn("[categories] erro ao ler categoria:", err);
  }
  return undefined;
}

/**
 * Catálogo de exemplo. Serve para:
 *  1) deixar a loja navegável quando o banco ainda está vazio (fallback);
 *  2) "semente" (seed) ao clicar em importar sem a Laquila configurada.
 */
export const MOCK_PRODUCTS: Product[] = [
  {
    id: "RM-STORM-BLACK",
    slug: "jaqueta-impermeavel-runmotos-storm-black",
    name: "Jaqueta Impermeável RunMotos Storm Black",
    description:
      "Jaqueta impermeável com costuras seladas, forro térmico removível e proteções CE nos ombros e cotovelos. Ideal para encarar a chuva sem perder o estilo.",
    price: 599.9,
    listPrice: 799.9,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
    categorySlug: "impermeaveis",
    brand: "RunMotos",
    rating: 4.6,
    reviews: 128,
    stock: 24,
    sizes: ["P", "M", "G", "GG", "XGG"],
    bestSeller: true,
  },
  {
    id: "RM-CITY-PROTECTOR",
    slug: "jaqueta-urban-runmotos-city-protector",
    name: "Jaqueta Urban RunMotos City Protector",
    description:
      "Design urbano com tecido resistente à abrasão e ventilação inteligente. Perfeita para o motoboy que vive na cidade.",
    price: 489.9,
    image: "https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800&q=80",
    categorySlug: "urbanas",
    brand: "RunMotos",
    rating: 4.5,
    reviews: 98,
    stock: 31,
    sizes: ["P", "M", "G", "GG"],
    bestSeller: true,
  },
  {
    id: "RM-ADVENTURE-PRO",
    slug: "jaqueta-touring-runmotos-adventure-pro",
    name: "Jaqueta Touring RunMotos Adventure Pro",
    description:
      "Pensada para longas viagens: bolsos amplos, faixas refletivas e máxima proteção em estradas de qualquer distância.",
    price: 689.9,
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
    categorySlug: "turismo",
    brand: "RunMotos",
    rating: 4.7,
    reviews: 156,
    stock: 18,
    sizes: ["M", "G", "GG", "XGG"],
    bestSeller: true,
  },
  {
    id: "RM-AIR-FLOW",
    slug: "jaqueta-ventilada-runmotos-air-flow",
    name: "Jaqueta Ventilada RunMotos Air Flow",
    description:
      "Tecido em mesh com fluxo de ar máximo para os dias mais quentes, sem abrir mão das proteções de segurança.",
    price: 459.9,
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80",
    categorySlug: "ventiladas",
    brand: "RunMotos",
    rating: 4.4,
    reviews: 76,
    stock: 42,
    sizes: ["P", "M", "G", "GG"],
    bestSeller: true,
  },
];

const SIZE_ORDER = [
  "PP", "XS", "P", "S", "M", "L", "G", "XL", "GG", "XXL", "XGG", "2XL",
  "XXXL", "3XL", "XXXXL", "4XL", "5XL", "6XL", "7XL", "U", "UN", "UNICO",
];
function sortSizes(sizes: string[]): string[] {
  const idx = (s: string) => {
    const i = SIZE_ORDER.indexOf(s.toUpperCase());
    return i === -1 ? 999 : i;
  };
  return [...new Set(sizes)].sort((a, b) => idx(a) - idx(b) || a.localeCompare(b));
}

type DbProductWithVariants = DbProduct & { variants: DbVariant[] };

/** Converte Produto-pai + variações para o tipo usado na UI. */
export function dbToProduct(p: DbProductWithVariants): Product {
  const variants = p.variants ?? [];
  const inStock = variants.filter((v) => v.stock > 0);
  const pool = inStock.length ? inStock : variants;
  const price = pool.length ? Math.min(...pool.map((v) => v.price)) : 0;
  const stock = variants.reduce((s, v) => s + v.stock, 0);
  const sizes = sortSizes(variants.map((v) => v.size ?? "").filter(Boolean));

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price,
    image: p.image,
    gallery: p.gallery ? p.gallery.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    categorySlug: p.categorySlug,
    categoria: p.categoria ?? undefined,
    subcategoria: p.subcategoria ?? undefined,
    brand: p.brand,
    rating: p.rating,
    reviews: p.reviews,
    stock,
    ean: variants.find((v) => v.ean)?.ean ?? undefined,
    ncm: p.ncm ?? undefined,
    sizes: sizes.length ? sizes : undefined,
    bestSeller: p.bestSeller,
    installments: installmentsFor(price),
  };
}

function withInstallments(p: Product): Product {
  return { ...p, installments: p.installments ?? installmentsFor(p.price) };
}

/** Fonte única de produtos: banco; se vazio, cai no catálogo de exemplo. */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { active: true },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(dbToProduct);
  } catch (err) {
    console.warn("[products] erro ao ler do banco:", err);
  }
  return [];
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    const row = await prisma.product.findUnique({ where: { slug }, include: { variants: true } });
    if (row) return dbToProduct(row);
  } catch (err) {
    console.warn("[products] erro ao ler produto:", err);
  }
  return undefined;
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.categorySlug === categorySlug);
}

export async function getBestSellers(): Promise<Product[]> {
  const all = await getAllProducts();
  const best = all.filter((p) => p.bestSeller);
  return best.length > 0 ? best : all.slice(0, 4);
}

/**
 * Produtos relacionados: mesma subcategoria > categoria > categoria-slug.
 * Exclui o próprio produto; prioriza os que têm foto e estoque.
 */
export async function getRelatedProducts(current: Product, limit = 4): Promise<Product[]> {
  const all = await getAllProducts();
  const hasImg = (p: Product) => !!p.image && p.image !== "/placeholder.svg";
  const score = (p: Product) => {
    let s = 0;
    if (current.subcategoria && p.subcategoria === current.subcategoria) s += 4;
    if (current.categoria && p.categoria === current.categoria) s += 2;
    if (p.categorySlug === current.categorySlug) s += 1;
    return s;
  };
  return all
    .filter((p) => p.id !== current.id && score(p) > 0)
    .sort(
      (a, b) =>
        score(b) - score(a) ||
        Number(hasImg(b)) - Number(hasImg(a)) ||
        Number(b.stock > 0) - Number(a.stock > 0),
    )
    .slice(0, limit);
}

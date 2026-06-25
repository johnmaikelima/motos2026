import "server-only";
import { prisma } from "./db";

const PLACEHOLDER = "/placeholder.svg";

export type Gift = { name: string; image: string; slug: string };

/** Lucro do produto = (preço exibido) − (custo da mesma variação). */
export function profitOf(variants: { price: number; cost: number | null; stock: number }[]): number | null {
  const inStock = variants.filter((v) => v.stock > 0);
  const pool = inStock.length ? inStock : variants;
  if (!pool.length) return null;
  const display = pool.reduce((a, b) => (a.price <= b.price ? a : b));
  return display.price - (display.cost ?? 0);
}

/**
 * Retorna o brinde aplicável a um produto (primeira regra ativa que ele atende),
 * ou null. Regra atual: "gift_by_profit" — lucro >= minProfit.
 */
export async function getGiftForProduct(productId: string): Promise<Gift | null> {
  const promos = await prisma.promotion.findMany({
    where: { active: true, type: "gift_by_profit", giftProductId: { not: null } },
    orderBy: { minProfit: "desc" },
  });
  if (!promos.length) return null;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { select: { price: true, cost: true, stock: true } } },
  });
  if (!product) return null;

  const profit = profitOf(product.variants);
  if (profit === null) return null;

  for (const promo of promos) {
    if (promo.giftProductId === productId) continue; // não dar o próprio produto
    if (profit >= promo.minProfit) {
      const gift = await prisma.product.findUnique({
        where: { id: promo.giftProductId! },
        select: { name: true, image: true, gallery: true, slug: true, active: true },
      });
      if (gift && gift.active) {
        // se a principal ainda for o placeholder, usa a 1ª foto real da galeria
        const fromGallery = (gift.gallery ?? "")
          .split(",")
          .map((s) => s.trim())
          .find((u) => u && u !== PLACEHOLDER);
        const image = gift.image && gift.image !== PLACEHOLDER ? gift.image : fromGallery ?? gift.image;
        return { name: gift.name, image, slug: gift.slug };
      }
    }
  }
  return null;
}

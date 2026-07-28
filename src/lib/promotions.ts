import "server-only";
import { prisma } from "./db";
import type { CartGift } from "./types";

const PLACEHOLDER = "/placeholder.svg";

export type Gift = { name: string; image: string; slug: string };

/** Escolhe a melhor imagem do brinde (ignora placeholder, cai p/ galeria). */
function giftImage(g: { image: string; gallery: string | null }): string {
  const fromGallery = (g.gallery ?? "")
    .split(",")
    .map((s) => s.trim())
    .find((u) => u && u !== PLACEHOLDER);
  return g.image && g.image !== PLACEHOLDER ? g.image : fromGallery ?? g.image;
}

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
        return { name: gift.name, image: giftImage(gift), slug: gift.slug };
      }
    }
  }
  return null;
}

/**
 * Resolve UM brinde para o carrinho inteiro (regra: 1 por pedido).
 * Pega a promoção de MAIOR minProfit que algum produto do carrinho atinge,
 * e devolve o produto-brinde com suas variações COM ESTOQUE (p/ o cliente
 * escolher o tamanho). Usado no carrinho, checkout e — como fonte da verdade —
 * no submitOrder. Retorna null se nada se qualifica ou não há estoque do brinde.
 */
export async function resolveCartGift(productIds: string[]): Promise<CartGift | null> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return null;

  const promos = await prisma.promotion.findMany({
    where: { active: true, type: "gift_by_profit", giftProductId: { not: null } },
    orderBy: { minProfit: "desc" },
  });
  if (!promos.length) return null;

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { variants: { select: { price: true, cost: true, stock: true } } },
  });

  // Maior lucro presente no carrinho.
  let bestProfit = -Infinity;
  for (const p of products) {
    const profit = profitOf(p.variants);
    if (profit !== null && profit > bestProfit) bestProfit = profit;
  }
  if (bestProfit === -Infinity) return null;

  // Primeira promo (maior minProfit) atingida — pulando brindes já no carrinho
  // ou sem estoque para entregar.
  for (const promo of promos) {
    if (ids.includes(promo.giftProductId!)) continue; // já está sendo comprado
    if (bestProfit < promo.minProfit) continue;

    const gift = await prisma.product.findUnique({
      where: { id: promo.giftProductId! },
      include: { variants: { select: { size: true, cdItem: true, stock: true } } },
    });
    if (!gift || !gift.active) continue;

    const inStock = gift.variants.filter((v) => v.stock > 0);
    if (!inStock.length) continue; // não dá pra entregar; tenta a próxima

    return {
      productId: gift.id,
      name: gift.name,
      image: giftImage(gift),
      slug: gift.slug,
      variants: inStock.map((v) => ({ size: v.size, cdItem: v.cdItem })),
    };
  }
  return null;
}

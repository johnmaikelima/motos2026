"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { resolveCartGift } from "@/lib/promotions";
import type { CartGift } from "@/lib/types";

export type PromoResult = { ok: boolean; message: string };

/** Brinde aplicável ao carrinho (1 por pedido). Lido pelo carrinho/checkout. */
export async function getCartGift(productIds: string[]): Promise<CartGift | null> {
  try {
    return await resolveCartGift(productIds);
  } catch (err) {
    console.warn("[promo] getCartGift:", (err as Error)?.message);
    return null;
  }
}

export async function createPromotion(input: {
  name: string;
  minProfit: number;
  giftProductId: string;
}): Promise<PromoResult> {
  if (!input.giftProductId) return { ok: false, message: "Escolha o produto que será o brinde." };
  try {
    await prisma.promotion.create({
      data: {
        name: input.name.trim() || "Brinde por lucro",
        type: "gift_by_profit",
        minProfit: Math.max(0, input.minProfit || 0),
        giftProductId: input.giftProductId,
        active: true,
      },
    });
    revalidatePath("/admin/promocoes");
    return { ok: true, message: "Regra criada." };
  } catch (err) {
    console.warn("[promo] create:", (err as Error)?.message);
    return { ok: false, message: "Erro ao criar a regra." };
  }
}

export async function updatePromotion(
  id: string,
  input: { name: string; minProfit: number; giftProductId: string }
): Promise<PromoResult> {
  try {
    await prisma.promotion.update({
      where: { id },
      data: {
        name: input.name.trim() || "Brinde por lucro",
        minProfit: Math.max(0, input.minProfit || 0),
        giftProductId: input.giftProductId || null,
      },
    });
    revalidatePath("/admin/promocoes");
    return { ok: true, message: "Regra atualizada." };
  } catch (err) {
    console.warn("[promo] update:", (err as Error)?.message);
    return { ok: false, message: "Erro ao atualizar." };
  }
}

export async function togglePromotion(id: string, active: boolean): Promise<PromoResult> {
  try {
    await prisma.promotion.update({ where: { id }, data: { active } });
    revalidatePath("/admin/promocoes");
    return { ok: true, message: active ? "Ativada." : "Desativada." };
  } catch (err) {
    console.warn("[promo] toggle:", (err as Error)?.message);
    return { ok: false, message: "Erro." };
  }
}

export async function deletePromotion(id: string): Promise<PromoResult> {
  try {
    await prisma.promotion.delete({ where: { id } });
    revalidatePath("/admin/promocoes");
    return { ok: true, message: "Regra excluída." };
  } catch (err) {
    console.warn("[promo] delete:", (err as Error)?.message);
    return { ok: false, message: "Erro ao excluir." };
  }
}

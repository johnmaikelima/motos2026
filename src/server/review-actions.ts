"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/session";

export type ReviewResult = { ok: boolean; message: string };

/** Verifica se o cliente comprou (pagou) algum item deste produto. */
async function boughtProduct(customerId: string, productId: string): Promise<boolean> {
  const variants = await prisma.variant.findMany({ where: { productId }, select: { cdItem: true } });
  const skus = variants.map((v) => v.cdItem);
  if (skus.length === 0) return false;
  const order = await prisma.order.findFirst({
    where: { customerId, paidAt: { not: null }, items: { some: { cdItem: { in: skus } } } },
    select: { id: true },
  });
  return !!order;
}

export type ReviewState = { loggedIn: boolean; canReview: boolean; alreadyReviewed: boolean };

export async function getReviewState(productId: string): Promise<ReviewState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { loggedIn: false, canReview: false, alreadyReviewed: false };
  const [canReview, mine] = await Promise.all([
    boughtProduct(customer.id, productId),
    prisma.review.findUnique({ where: { productId_customerId: { productId, customerId: customer.id } } }),
  ]);
  return { loggedIn: true, canReview, alreadyReviewed: !!mine };
}

export async function submitReview(productId: string, rating: number, comment: string): Promise<ReviewResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, message: "Entre na sua conta para avaliar." };
  const r = Math.round(rating);
  if (r < 1 || r > 5) return { ok: false, message: "Selecione de 1 a 5 estrelas." };
  if (!(await boughtProduct(customer.id, productId))) {
    return { ok: false, message: "Só quem comprou este produto pode avaliar." };
  }
  try {
    await prisma.review.upsert({
      where: { productId_customerId: { productId, customerId: customer.id } },
      update: { rating: r, comment: comment.trim() || null, authorName: customer.name ?? customer.email },
      create: { productId, customerId: customer.id, rating: r, comment: comment.trim() || null, authorName: customer.name ?? customer.email },
    });
    // Atualiza média e contagem no produto (usadas na loja).
    const agg = await prisma.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
    await prisma.product.update({
      where: { id: productId },
      data: { rating: agg._avg.rating ?? 0, reviews: agg._count },
    });
    revalidatePath("/produtos");
    return { ok: true, message: "Avaliação enviada. Obrigado!" };
  } catch (err) {
    console.warn("[review] submit:", (err as Error)?.message);
    return { ok: false, message: "Erro ao enviar a avaliação." };
  }
}

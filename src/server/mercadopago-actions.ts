"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createPixPayment, getMpPayment, isMpConfigured } from "@/lib/mercadopago";
import { pixDiscountValue } from "@/lib/pricing";

export type PixResult =
  | { ok: true; qrCodeBase64?: string; copiaECola?: string; ticketUrl?: string }
  | { ok: false; error: string };

/** Cria o pagamento PIX no Mercado Pago para um pedido local. */
export async function createPixForOrder(localOrderId: string): Promise<PixResult> {
  if (!isMpConfigured()) return { ok: false, error: "Mercado Pago ainda não configurado (MERCADOPAGO_ACCESS_TOKEN)." };
  try {
    const order = await prisma.order.findUnique({ where: { id: localOrderId } });
    if (!order) return { ok: false, error: "Pedido não encontrado." };
    if (order.paidAt) return { ok: false, error: "Este pedido já foi pago." };

    // Desconto PIX (% configurável) sobre os PRODUTOS (subtotal), não sobre o frete.
    const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { pixDiscountPct: true } });
    const discount = pixDiscountValue(order.subtotal, setting?.pixDiscountPct ?? 5);
    const pixAmount = Math.round((order.total - discount) * 100) / 100;

    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const notificationUrl = site ? `${site}/api/webhooks/mercadopago` : undefined;

    const nome = order.customerName.trim();
    const sp = nome.indexOf(" ");
    const pay = await createPixPayment(
      pixAmount,
      {
        email: order.email,
        firstName: sp > 0 ? nome.slice(0, sp) : nome,
        lastName: sp > 0 ? nome.slice(sp + 1) : ".",
        cpf: (order.cpf || "").replace(/\D/g, ""),
      },
      String(order.number),
      notificationUrl
    );

    const td = pay.point_of_interaction?.transaction_data;
    await prisma.order.update({
      where: { id: localOrderId },
      data: { paymentId: String(pay.id), paymentMethod: "pix_mercadopago", discount },
    });
    return { ok: true, qrCodeBase64: td?.qr_code_base64, copiaECola: td?.qr_code, ticketUrl: td?.ticket_url };
  } catch (err) {
    console.warn("[mp] createPix:", (err as Error)?.message);
    return { ok: false, error: (err as Error)?.message ?? "Erro ao gerar o PIX." };
  }
}

/** Verifica se o PIX foi pago; se sim, marca o pedido como PAGO. */
export async function checkPixStatus(
  localOrderId: string
): Promise<{ ok: boolean; paid?: boolean; status?: string; error?: string }> {
  try {
    const order = await prisma.order.findUnique({ where: { id: localOrderId } });
    if (!order || !order.paymentId) return { ok: false, error: "Pedido sem pagamento PIX." };
    if (order.paidAt) return { ok: true, paid: true, status: "approved" };

    const pay = await getMpPayment(order.paymentId);
    if (pay.status === "approved") {
      await prisma.order.update({ where: { id: order.id }, data: { status: "pago", paidAt: new Date() } });
      revalidatePath("/admin/pedidos");
      return { ok: true, paid: true, status: pay.status };
    }
    return { ok: true, paid: false, status: pay.status };
  } catch (err) {
    console.warn("[mp] checkPixStatus:", (err as Error)?.message);
    return { ok: false, error: (err as Error)?.message ?? "Erro ao verificar o PIX." };
  }
}

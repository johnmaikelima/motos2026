"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createPaypalOrder, capturePaypalOrder, isPaypalConfigured } from "@/lib/paypal";

/** Cria um pedido no PayPal para um pedido LOCAL (usa o total do nosso banco). */
export async function createPaypalOrderAction(
  localOrderId: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isPaypalConfigured()) return { ok: false, error: "PayPal não configurado." };
  try {
    const order = await prisma.order.findUnique({ where: { id: localOrderId } });
    if (!order) return { ok: false, error: "Pedido não encontrado." };
    if (order.paidAt) return { ok: false, error: "Este pedido já foi pago." };

    // total vem do NOSSO banco (não confia em valor do navegador)
    const pp = await createPaypalOrder(order.total, { currency: "BRL", reference: String(order.number) });
    await prisma.order.update({
      where: { id: localOrderId },
      data: { paymentId: pp.id, paymentMethod: "paypal_card" },
    });
    return { ok: true, id: pp.id };
  } catch (err) {
    console.warn("[paypal] createOrder:", (err as Error)?.message);
    return { ok: false, error: (err as Error)?.message ?? "Erro ao iniciar o pagamento." };
  }
}

/** Captura (cobra) o pagamento e marca o pedido local como PAGO. */
export async function capturePaypalOrderAction(
  paypalOrderId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = (await capturePaypalOrder(paypalOrderId)) as {
      status?: string;
      purchase_units?: { payments?: { captures?: { id?: string }[] } }[];
    };
    if (result.status !== "COMPLETED") {
      return { ok: false, error: `Pagamento não concluído (${result.status ?? "desconhecido"}).` };
    }

    const order = await prisma.order.findFirst({ where: { paymentId: paypalOrderId } });
    if (order && !order.paidAt) {
      const captureId = result.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "pago", paidAt: new Date(), paymentId: captureId ?? paypalOrderId },
      });
      revalidatePath("/admin/pedidos");
    }
    return { ok: true };
  } catch (err) {
    console.warn("[paypal] capture:", (err as Error)?.message);
    return { ok: false, error: (err as Error)?.message ?? "Erro ao confirmar o pagamento." };
  }
}

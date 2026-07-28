"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createPlusPayment, executePlusPayment, isPaypalConfigured } from "@/lib/paypal";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Cria um pagamento PayPal Plus (v1) para um pedido local. Retorna a approval_url do iframe. */
export async function createPlusPaymentAction(
  localOrderId: string
): Promise<{ ok: boolean; approvalUrl?: string; paymentId?: string; error?: string }> {
  if (!isPaypalConfigured()) return { ok: false, error: "PayPal não configurado." };
  try {
    const order = await prisma.order.findUnique({ where: { id: localOrderId } });
    if (!order) return { ok: false, error: "Pedido não encontrado." };
    if (order.paidAt) return { ok: false, error: "Este pedido já foi pago." };

    const nome = order.customerName.trim();
    const sp = nome.indexOf(" ");
    const firstName = sp > 0 ? nome.slice(0, sp) : nome;
    const lastName = sp > 0 ? nome.slice(sp + 1) : ".";

    const payment = await createPlusPayment(order.total, {
      currency: "BRL",
      reference: String(order.number),
      returnUrl: `${SITE}/checkout`,
      cancelUrl: `${SITE}/checkout`,
      payer: {
        email: order.email,
        firstName,
        lastName,
        taxId: order.cpf,
        phone: order.phone ?? undefined,
        line1: [order.address, order.addressNumber].filter(Boolean).join(", ") || undefined,
        city: order.city ?? undefined,
        state: order.uf ?? undefined,
        postalCode: order.cep ?? undefined,
      },
    });
    const approvalUrl = payment.links.find((l) => l.rel === "approval_url")?.href;
    if (!approvalUrl) return { ok: false, error: "PayPal não retornou a URL de aprovação." };

    await prisma.order.update({
      where: { id: localOrderId },
      data: { paymentId: payment.id, paymentMethod: "paypal_plus" },
    });
    return { ok: true, approvalUrl, paymentId: payment.id };
  } catch (err) {
    console.warn("[paypal-plus] create:", (err as Error)?.message);
    return { ok: false, error: (err as Error)?.message ?? "Erro ao iniciar o pagamento." };
  }
}

/** Executa (cobra) o pagamento Plus aprovado e marca o pedido como PAGO. */
export async function executePlusPaymentAction(
  paymentId: string,
  payerId: string,
  term?: number | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = (await executePlusPayment(paymentId, payerId)) as {
      state?: string;
      credit_financing_offered?: { term?: number };
      transactions?: { related_resources?: { sale?: { id?: string } }[] }[];
    };
    if (result.state !== "approved") {
      return { ok: false, error: `Pagamento não aprovado (${result.state ?? "?"}).` };
    }

    const order = await prisma.order.findFirst({ where: { paymentId } });
    if (order && !order.paidAt) {
      const parcelas = term ?? result.credit_financing_offered?.term ?? null;
      const saleId = result.transactions?.[0]?.related_resources?.[0]?.sale?.id;
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "pago",
          paidAt: new Date(),
          installments: parcelas,
          paymentId: saleId ?? paymentId,
        },
      });
      revalidatePath("/admin/pedidos");
    }
    return { ok: true };
  } catch (err) {
    console.warn("[paypal-plus] execute:", (err as Error)?.message);
    return { ok: false, error: (err as Error)?.message ?? "Erro ao confirmar o pagamento." };
  }
}

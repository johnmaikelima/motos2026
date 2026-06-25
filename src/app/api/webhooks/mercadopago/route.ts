import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getMpPayment, isMpConfigured } from "@/lib/mercadopago";

/**
 * Webhook do Mercado Pago: notifica quando um pagamento muda de status.
 * SEGURANÇA: não confiamos no corpo — RE-CONSULTAMOS o pagamento no MP (com o
 * nosso Access Token) e só marcamos como pago se o MP disser "approved".
 * Sempre respondemos 200 para o MP não reenviar em loop.
 */
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  try {
    if (!isMpConfigured()) return NextResponse.json({ ok: true });

    const url = new URL(req.url);
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";
    const topic = url.searchParams.get("type") || url.searchParams.get("topic") || "";

    let body: { type?: string; action?: string; data?: { id?: string | number }; id?: string | number } | null = null;
    try {
      body = await req.json();
    } catch {
      /* notificação pode vir sem corpo (só query) */
    }
    if (!paymentId && body) paymentId = String(body.data?.id ?? body.id ?? "");
    const evt = (topic || body?.type || body?.action || "").toLowerCase();

    // Só nos interessa pagamento (ignora merchant_order, etc.).
    if (paymentId && (evt === "" || evt.includes("payment"))) {
      const pay = await getMpPayment(paymentId);
      if (pay?.status === "approved") {
        const order = await prisma.order.findFirst({ where: { paymentId: String(paymentId) } });
        if (order && !order.paidAt) {
          await prisma.order.update({ where: { id: order.id }, data: { status: "pago", paidAt: new Date() } });
          revalidatePath("/admin/pedidos");
        }
      }
    }
  } catch (err) {
    console.warn("[webhook mp]", (err as Error)?.message);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  return handle(req);
}
// O MP às vezes valida a URL com um GET.
export async function GET(req: Request) {
  return handle(req);
}

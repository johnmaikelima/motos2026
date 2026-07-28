import "server-only";
import crypto from "node:crypto";

/**
 * Mercado Pago — pagamento por PIX (API de Payments).
 * O Access Token fica só no servidor (sem NEXT_PUBLIC_).
 * Use o token de TESTE (TEST-...) para o sandbox.
 */

const ACCESS = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
const BASE = "https://api.mercadopago.com";

export function isMpConfigured(): boolean {
  return ACCESS.length > 0;
}

export type MpPixPayer = {
  email: string;
  firstName: string;
  lastName: string;
  cpf: string; // só dígitos
};

/** Cria um pagamento PIX. Retorna { id, status, point_of_interaction.transaction_data }. */
export async function createPixPayment(
  amount: number,
  payer: MpPixPayer,
  reference: string,
  notificationUrl?: string
) {
  const body: Record<string, unknown> = {
    transaction_amount: Number(amount.toFixed(2)),
    description: `Pedido ${reference}`,
    payment_method_id: "pix",
    external_reference: reference,
    payer: {
      email: payer.email,
      first_name: payer.firstName,
      last_name: payer.lastName,
      identification: { type: "CPF", number: payer.cpf },
    },
  };
  // O MP só aceita notification_url HTTPS pública (em localhost não funciona).
  if (notificationUrl && /^https:\/\//i.test(notificationUrl)) {
    body.notification_url = notificationUrl;
  }

  const res = await fetch(`${BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MercadoPago createPix ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data as {
    id: number;
    status: string;
    point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
  };
}

/** Consulta um pagamento (para saber se o PIX foi pago). */
export async function getMpPayment(id: string) {
  const res = await fetch(`${BASE}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${ACCESS}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MercadoPago getPayment ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data as { id: number; status: string };
}

/** Testa a conexão (lista métodos de pagamento). */
export async function pingMp(): Promise<{ ok: boolean; message: string }> {
  if (!isMpConfigured()) return { ok: false, message: "MERCADOPAGO_ACCESS_TOKEN não configurado." };
  try {
    const res = await fetch(`${BASE}/v1/payment_methods`, { headers: { Authorization: `Bearer ${ACCESS}` }, cache: "no-store" });
    if (!res.ok) return { ok: false, message: `Falha (${res.status}). Token inválido?` };
    return { ok: true, message: "Conectado ao Mercado Pago." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

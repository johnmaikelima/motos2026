import "server-only";

/**
 * Cliente PayPal (REST v2) — Advanced Checkout (cartão).
 * SEGURANÇA: Client ID + Secret ficam só no servidor (sem NEXT_PUBLIC_ no Secret).
 * Troca sandbox <-> live só mudando PAYPAL_ENV.
 */

const ENV = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();
const BASE = ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const SECRET = process.env.PAYPAL_SECRET ?? "";

export function isPaypalConfigured(): boolean {
  return CLIENT_ID.length > 0 && SECRET.length > 0;
}
export function paypalEnv(): string {
  return ENV;
}

async function getAccessToken(): Promise<string> {
  if (!isPaypalConfigured()) throw new Error("PayPal não configurado (PAYPAL_CLIENT_ID/PAYPAL_SECRET).");
  const auth = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = (await res.json()) as { access_token?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`PayPal token ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data.access_token;
}

/** Cria um pedido (intent CAPTURE) no PayPal. Retorna { id, status, ... }. */
export async function createPaypalOrder(amount: number, opts: { currency?: string; reference?: string } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: opts.currency ?? "BRL", value: amount.toFixed(2) },
          custom_id: opts.reference,
        },
      ],
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal createOrder ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data as { id: string; status: string };
}

/** Captura (cobra) um pedido aprovado. Retorna o resultado da captura. */
export async function capturePaypalOrder(paypalOrderId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal capture ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

/* --------- PayPal Plus (checkout transparente / iframe — Brasil) --------- */
// Usa a API v1 de pagamentos. Retorna a approval_url que o iframe ppplusdcc usa.

export type PlusPayer = {
  email?: string;
  firstName?: string;
  lastName?: string;
  taxId?: string; // CPF (só dígitos)
  phone?: string;
  line1?: string;
  city?: string;
  state?: string; // UF
  postalCode?: string; // CEP
};

export async function createPlusPayment(
  amount: number,
  opts: { returnUrl: string; cancelUrl: string; currency?: string; reference?: string; payer?: PlusPayer }
) {
  const token = await getAccessToken();
  const p = opts.payer;

  const address =
    p?.line1 && p?.city && p?.state && p?.postalCode
      ? {
          line1: p.line1,
          city: p.city,
          state: p.state,
          postal_code: p.postalCode.replace(/\D/g, ""),
          country_code: "BR",
        }
      : undefined;

  const payerInfo = p
    ? {
        email: p.email,
        first_name: p.firstName,
        last_name: p.lastName,
        ...(p.taxId ? { tax_id: p.taxId.replace(/\D/g, ""), tax_id_type: "BR_CPF" } : {}),
        ...(address ? { billing_address: address } : {}),
      }
    : undefined;

  const res = await fetch(`${BASE}/v1/payments/payment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "sale",
      payer: { payment_method: "paypal", ...(payerInfo ? { payer_info: payerInfo } : {}) },
      transactions: [
        {
          amount: { total: amount.toFixed(2), currency: opts.currency ?? "BRL" },
          description: opts.reference ? `Pedido ${opts.reference}` : "Pedido",
          ...(address
            ? {
                item_list: {
                  shipping_address: {
                    recipient_name: `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim() || undefined,
                    ...address,
                  },
                },
              }
            : {}),
        },
      ],
      redirect_urls: { return_url: opts.returnUrl, cancel_url: opts.cancelUrl },
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Plus createPayment ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data as { id: string; state: string; links: { rel: string; href: string }[] };
}

export async function executePlusPayment(paymentId: string, payerId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/v1/payments/payment/${paymentId}/execute`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ payer_id: payerId }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Plus execute ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

/** Testa a conexão (autenticação) com o PayPal. */
export async function pingPaypal(): Promise<{ ok: boolean; env: string; message: string }> {
  try {
    await getAccessToken();
    return { ok: true, env: ENV, message: `Conectado ao PayPal (${ENV}).` };
  } catch (err) {
    return { ok: false, env: ENV, message: (err as Error).message };
  }
}

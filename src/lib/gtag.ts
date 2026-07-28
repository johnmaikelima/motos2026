"use client";

// Utilitários do gtag (GA4 / Google Ads). Seguros se o gtag não estiver carregado.

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const g = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof g === "function" ? g : null;
}

export function gaEvent(name: string, params: Record<string, unknown>): void {
  const gtag = getGtag();
  if (gtag) gtag("event", name, params);
}

export type PurchaseItem = { item_id: string; item_name: string; quantity: number; price: number };

/** Evento de compra (GA4). Chamar 1x quando o pagamento é aprovado. */
export function gaPurchase(input: {
  transactionId: string;
  value: number;
  shipping?: number;
  items?: PurchaseItem[];
}): void {
  gaEvent("purchase", {
    transaction_id: input.transactionId,
    currency: "BRL",
    value: Math.round(input.value * 100) / 100,
    ...(input.shipping != null ? { shipping: Math.round(input.shipping * 100) / 100 } : {}),
    ...(input.items ? { items: input.items } : {}),
  });
}

/**
 * Regras de preço/pagamento. Funções PURAS (rodam no cliente e no servidor).
 * A % de desconto do PIX é configurável (Setting.pixDiscountPct); estas funções
 * recebem a % por parâmetro. O default é só um fallback.
 */

export const DEFAULT_PIX_DISCOUNT_PCT = 5;

/** Preço com o desconto PIX aplicado. */
export function pixPrice(value: number, pct: number = DEFAULT_PIX_DISCOUNT_PCT): number {
  return Math.round(value * (1 - pct / 100) * 100) / 100;
}

/** Valor (em R$) do desconto PIX sobre um valor. */
export function pixDiscountValue(value: number, pct: number = DEFAULT_PIX_DISCOUNT_PCT): number {
  return Math.round(value * (pct / 100) * 100) / 100;
}

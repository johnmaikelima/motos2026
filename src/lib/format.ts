export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * A Laquila devolve números no padrão brasileiro ("1.234,56").
 * Converte para number de forma segura.
 */
export function parseBRNumber(input: unknown): number {
  if (typeof input === "number") return input;
  if (typeof input !== "string" || input.trim() === "") return 0;
  const normalized = input.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Formata number para o padrão que a Laquila espera ("10,00"). */
export function toBRNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace(".", ",");
}

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Regra de preço de venda (definida pelo cliente):
 *  - se há Valor Sugerido (coluna S > 0): usa o sugerido;
 *  - senão: (custo + 10,00) + 50%  ->  (custo + 10) × 1,5.
 */
export function precoVenda(custo: number, sugerido: number): number {
  const base = sugerido > 0 ? sugerido : (custo + 10) * 1.5;
  return Math.round(base * 100) / 100;
}

export function installmentsFor(price: number, max = 10) {
  // Parcela "sem juros" simples, mínimo de R$ 20/parcela.
  let count = max;
  while (count > 1 && price / count < 20) count--;
  return { count, value: price / count };
}

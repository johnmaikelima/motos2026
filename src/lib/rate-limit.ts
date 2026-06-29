import "server-only";

/**
 * Rate limiting simples em memória (janela fixa). Suficiente para 1 instância
 * (caso do Coolify). Para múltiplas instâncias, trocar por Redis/Upstash.
 */

const buckets = new Map<string, { count: number; reset: number }>();

/** Retorna true se PODE prosseguir; false se estourou o limite. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    // Limpeza preguiçosa para não crescer sem limite.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    }
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

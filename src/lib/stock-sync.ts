import "server-only";
import { prisma } from "./db";
import { getStockAndPrice, isLaquilaConfigured } from "./laquila";

/**
 * Sincroniza o ESTOQUE das variações com o saldo atual da Laquila (método 00006).
 * Casa pelo SKU (Variant.cdItem == cd_item da API). Atualiza SÓ o estoque.
 * Cada execução gera um registro em StockSyncLog (com o de->para de cada SKU).
 */

type Change = { cdItem: string; de: number; para: number };

export type StockSyncResult = {
  ok: boolean;
  checked: number; // itens lidos da API
  updated: number; // variações alteradas
  notFound: number; // SKUs da API que não temos
  message: string;
  logId?: string;
};

const PER_PAGE = 5000; // 00017 aceita até 10000 por página
const MAX_PAGES = 300; // trava de segurança

// Campos do retorno do 00017 (confirmados na doc): item.cd_item / item.qt_saldo.
const CD_KEYS = ["cd_item", "cdItem", "sku", "codigo", "cd_produto"];
const SALDO_KEYS = ["qt_saldo", "saldo", "qt_estoque", "estoque", "qtd", "quantidade", "qt_disponivel"];

/**
 * Extrai a lista de itens do retorno do 00017:
 *   { resultados: { itens: [ { item: { cd_item, qt_saldo } } ] } }
 * Também aceita formatos alternativos por segurança.
 */
function extractItems(res: unknown): Record<string, unknown>[] {
  if (!res) return [];
  const root = (res as Record<string, unknown>).resultados ?? res;
  let arr: unknown =
    (root as Record<string, unknown>)?.itens ??
    (root as Record<string, unknown>)?.dados ??
    (Array.isArray(root) ? root : undefined);
  if (!Array.isArray(arr)) arr = [];
  // cada elemento pode ser { item: {...} } ou {...} direto
  return (arr as unknown[]).map((x) => {
    const o = x as Record<string, unknown>;
    return (o?.item as Record<string, unknown>) ?? o;
  });
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || v === null || v === "") continue;
    const n = Number(String(v).replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

async function writeLog(source: "manual" | "cron", r: Omit<StockSyncResult, "logId">, changes: Change[]) {
  return prisma.stockSyncLog.create({
    data: {
      source,
      ok: r.ok,
      checked: r.checked,
      updated: r.updated,
      notFound: r.notFound,
      message: r.message,
      details: changes.length ? JSON.stringify(changes.slice(0, 2000)) : null,
    },
  });
}

export async function syncStockFromApi(source: "manual" | "cron"): Promise<StockSyncResult> {
  if (!isLaquilaConfigured()) {
    const r = { ok: false, checked: 0, updated: 0, notFound: 0, message: "Laquila não configurada (LAQUILA_TOKEN/CNPJ)." };
    const log = await writeLog(source, r, []);
    return { ...r, logId: log.id };
  }

  // Mapa SKU -> { id, stock } (1 leitura só).
  const variants = await prisma.variant.findMany({ select: { id: true, cdItem: true, stock: true } });
  const byCd = new Map(variants.map((v) => [v.cdItem, v]));

  const changes: Change[] = [];
  let checked = 0;
  let notFound = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await getStockAndPrice(page, PER_PAGE);
    if (res == null) {
      // Falha de API (token inválido/instável). Se já na 1ª página, aborta.
      if (page === 1) {
        const r = { ok: false, checked: 0, updated: 0, notFound: 0, message: "API indisponível (token inválido?). Estoque não atualizado." };
        const log = await writeLog(source, r, []);
        return { ...r, logId: log.id };
      }
      break; // falhou no meio: mantém o que já atualizou
    }

    const items = extractItems(res);
    if (items.length === 0) break;

    for (const it of items) {
      const cd = pickStr(it, CD_KEYS);
      const saldo = pickNum(it, SALDO_KEYS);
      if (!cd || saldo === undefined) continue;
      checked++;
      const v = byCd.get(cd);
      if (!v) {
        notFound++;
        continue;
      }
      const novo = Math.max(0, Math.round(saldo));
      if (novo !== v.stock) {
        changes.push({ cdItem: cd, de: v.stock, para: novo });
        await prisma.variant.update({ where: { id: v.id }, data: { stock: novo, lastSyncedAt: new Date() } });
      }
    }

    if (items.length < PER_PAGE) break; // última página
  }

  const r = {
    ok: true,
    checked,
    updated: changes.length,
    notFound,
    message:
      `${changes.length} variação(ões) atualizada(s) de ${checked} consultada(s).` +
      (notFound ? ` ${notFound} SKU(s) da API não estão no catálogo.` : ""),
  };
  const log = await writeLog(source, r, changes);
  return { ...r, logId: log.id };
}

/** Lê os últimos registros de sincronização (para a tela do painel). */
export async function listStockSyncLogs(take = 30) {
  try {
    return await prisma.stockSyncLog.findMany({ orderBy: { createdAt: "desc" }, take });
  } catch (err) {
    // Tabela ausente (faltou `prisma db push` em produção) ou banco offline.
    console.warn("[stock] listStockSyncLogs:", (err as Error)?.message);
    return [];
  }
}

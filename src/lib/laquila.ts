import "server-only";

/**
 * Cliente da API de Dropshipping da Laquila.
 *
 * IMPORTANTE (SEGURANÇA):
 * - Este módulo importa "server-only": se alguém tentar usá-lo em um componente
 *   de cliente, o build QUEBRA. Assim o token nunca vaza para o navegador.
 * - O token e o CNPJ vêm de variáveis de ambiente SEM o prefixo NEXT_PUBLIC_,
 *   ou seja, ficam apenas no servidor.
 *
 * Autenticação Laquila: o token vai no caminho da URL ->
 *   {BASE_URL}/{TOKEN}/{METODO}
 * e o corpo da requisição sempre inclui cnpj_empresa.
 */

const BASE_URL = process.env.LAQUILA_BASE_URL ?? "https://api-dropshipping.laquila.com.br";
// Token do CLIENTE (você): vai no campo "token" do corpo.
const TOKEN = process.env.LAQUILA_TOKEN ?? "";
// Token que vai na URL. Por padrão é o mesmo do cliente; se a Laquila usar um
// token DIFERENTE para a URL, defina LAQUILA_URL_TOKEN.
const URL_TOKEN = process.env.LAQUILA_URL_TOKEN ?? TOKEN;
// cnpj_empresa = CNPJ da LAQUILA (fixo), não o seu.
const CNPJ_EMPRESA = process.env.LAQUILA_CNPJ_EMPRESA ?? "03902443000166";
const CNPJ = process.env.LAQUILA_CNPJ ?? "";
// cpf_cnpj_consulta é OPCIONAL quando o token tem 1 só CNPJ vinculado (caso comum).
// Por padrão NÃO enviamos. Só define LAQUILA_CPF_CONSULTA se o token tiver +1 CNPJ.
const CPF_CONSULTA = process.env.LAQUILA_CPF_CONSULTA?.trim() || undefined;
// Wrapper do corpo. A foto do suporte usa "filtro"; o PDF usa "pedido".
// Default = "filtro" (foi o que o suporte enviou). Troque via LAQUILA_WRAPPER se precisar.
const DEFAULT_WRAPPER: "pedido" | "filtro" =
  process.env.LAQUILA_WRAPPER === "pedido" ? "pedido" : "filtro";

export function isLaquilaConfigured(): boolean {
  return TOKEN.length > 0 && CNPJ.length > 0;
}

type LaquilaParams = Record<string, string | number | undefined>;

async function callLaquila<T = unknown>(
  method: string,
  params: LaquilaParams = {},
  init?: { revalidate?: number },
  wrapper: "pedido" | "filtro" = DEFAULT_WRAPPER
): Promise<T> {
  if (!isLaquilaConfigured()) {
    throw new Error(
      "Laquila não configurada: defina LAQUILA_TOKEN e LAQUILA_CNPJ no .env.local"
    );
  }

  // A Laquila exige o corpo dentro de um wrapper ("pedido" na maioria dos
  // métodos; "filtro" só em 00012/00015), com cnpj_empresa + token.
  // cnpj_empresa = CNPJ da Laquila (fixo). Todos os valores como STRING.
  const inner: Record<string, string> = {
    cnpj_empresa: CNPJ_EMPRESA,
    token: TOKEN,
  };
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) inner[k] = String(v);
  }

  const res = await fetch(`${BASE_URL}/${URL_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ [wrapper]: inner }),
    // Cache no servidor; revalida a cada X segundos (estoque/preço mudam pouco a cada minuto)
    next: { revalidate: init?.revalidate ?? 300 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Laquila ${method} falhou (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as T;
}

/* ----------------------- Métodos da API ----------------------- */

/**
 * Versão "segura" para LEITURAS: em vez de lançar exceção (que polui o
 * overlay de erro do Next em dev), retorna null em caso de falha e registra
 * um aviso. Quem chama trata o null caindo no fallback.
 */
async function safeCall<T = unknown>(
  method: string,
  params: LaquilaParams = {},
  init?: { revalidate?: number },
  wrapper: "pedido" | "filtro" = DEFAULT_WRAPPER
): Promise<T | null> {
  try {
    return await callLaquila<T>(method, params, init, wrapper);
  } catch (err) {
    console.warn(`[laquila] ${method} indisponível:`, (err as Error)?.message);
    return null;
  }
}

/** 00017 — Consultar SOMENTE saldo (mais rápido; ideal p/ sync de estoque). */
export function getStockOnly(pagina = 1, itensPorPagina = 10000, cdItem?: string) {
  return safeCall("00017", {
    pagina,
    itensporpagina: itensPorPagina,
    cd_item: cdItem ?? "",
  });
}

/** 00006 — Estoque e preço (paginado). Inclui cpf_cnpj_consulta. */
export function getStockAndPrice(pagina = 1, itensPorPagina = 50, cdItem?: string) {
  return safeCall("00006", {
    cpf_cnpj_consulta: CPF_CONSULTA,
    pagina,
    itensporpagina: itensPorPagina,
    cd_item: cdItem ?? "",
  });
}

/** 00007 — Detalhes do item (NCM, EAN, peso, dimensões). */
export function getItemDetails(pagina = 1, itensPorPagina = 50, cdItem?: string) {
  return safeCall("00007", {
    pagina,
    itensporpagina: itensPorPagina,
    cd_item: cdItem,
  });
}

/** 00015 — Lista de transportadoras. */
export function listCarriers(cdTransportador?: string) {
  return safeCall("00015", { cd_transportador: cdTransportador });
}

/** 00008 — Consulta de pedidos. */
export function getOrder(idPedido?: string, pagina = 1, registrosPorPagina = 20) {
  return safeCall("00008", {
    id_pedido: idPedido,
    pagina,
    registrosporpagina: registrosPorPagina,
  });
}

export type CreateOrderItem = { cd_item: string; qt: string; vl_preco?: string };

/** 00002 — Criação de pedido. Roda SOMENTE no servidor (Server Action). */
export function createOrder(input: {
  cpf_cnpj: string;
  nm_cliente: string;
  cd_transportador: string;
  itens: CreateOrderItem[];
  // ... demais campos de endereço conforme a doc da Laquila
  extra?: Record<string, string>;
}) {
  return callLaquila<{ id_pedido?: string }>("00002", {
    cpf_cnpj: input.cpf_cnpj,
    nm_cliente: input.nm_cliente,
    cd_transportador: input.cd_transportador,
    // A doc usa itens[]; ajuste a serialização conforme o exemplo oficial.
    itens: JSON.stringify(input.itens),
    ...input.extra,
  });
}

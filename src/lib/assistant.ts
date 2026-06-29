import "server-only";
import { getAllProducts, getProductBySlug } from "./products";
import { getStoreSettings } from "./store-settings";
import { listSizeCharts } from "./sizecharts";
import { formatBRL } from "./format";

/**
 * Atendente virtual (IA) da loja. Responde como atendente HUMANO — nunca revela
 * que é IA. Usa o catálogo + políticas da loja como contexto.
 * A chave OpenAI fica só no servidor (este módulo é server-only).
 */

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export type ChatMessage = { role: "user" | "assistant"; content: string };

// Cache do contexto (catálogo + tabelas de tamanho), 5 min.
let ctxCache: { catalog: string; sizes: string; at: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

async function buildContext(): Promise<{ catalog: string; sizes: string }> {
  if (ctxCache && Date.now() - ctxCache.at < CACHE_MS) return ctxCache;

  const products = await getAllProducts();
  const catalog = products
    .slice(0, 400)
    .map((p) => {
      const sizes = p.sizes?.length ? ` | tamanhos: ${p.sizes.join(", ")}` : "";
      const stock = p.stock > 0 ? "" : " | ESGOTADO";
      const cat = p.categoria ? ` (${p.categoria})` : "";
      return `- ${p.name} — ${formatBRL(p.price)}${cat}${sizes}${stock} | /produto/${p.slug}`;
    })
    .join("\n");

  const charts = await listSizeCharts().catch(() => []);
  const sizes = charts
    .filter((c) => c.active !== false && c.rows?.length)
    .map((c) => {
      const cats = c.categories?.length ? ` [vale para: ${c.categories.join(", ")}]` : "";
      const rows = c.rows
        .map((r) => `${r.min}-${r.max}→BR ${r.brasil}/${r.universal}/EU ${r.europa}`)
        .join("; ");
      return `[${c.name}]${cats} ${c.measureLabel}: ${rows}`;
    })
    .join("\n");

  ctxCache = { catalog, sizes, at: Date.now() };
  return ctxCache;
}

/** Extrai os produtos citados na resposta (pelos links /produto/slug) para mostrar com foto. */
export type ChatProduct = { slug: string; name: string; price: number; image: string };
export async function productsFromReply(reply: string): Promise<ChatProduct[]> {
  const slugs = [
    ...new Set((reply.match(/\/produto\/([a-z0-9-]+)/gi) || []).map((s) => s.replace(/^\/produto\//i, ""))),
  ].slice(0, 4);
  const out: ChatProduct[] = [];
  for (const slug of slugs) {
    const p = await getProductBySlug(slug);
    if (p && p.image && p.image !== "/placeholder.svg") {
      out.push({ slug: p.slug, name: p.name, price: p.price, image: p.image });
    }
  }
  return out;
}

export async function chatWithAssistant(history: ChatMessage[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  const s = await getStoreSettings();
  const loja = s.storeName || "a loja";
  const fallback =
    `Desculpe, não consegui responder agora. ` +
    (s.whatsapp ? `Chama a gente no WhatsApp ${s.whatsapp}` : "Tente novamente em instantes") +
    (s.contactEmail ? ` ou no e-mail ${s.contactEmail}.` : ".");
  if (!key) return fallback;

  const { catalog, sizes } = await buildContext();

  const system = `Você faz parte da equipe de atendimento da ${loja}, uma loja online de equipamentos e roupas para motociclistas.
Fale como um atendente HUMANO: simpático, próximo e prestativo, em português do Brasil.
NUNCA diga que é uma IA, robô, bot, assistente virtual ou modelo de linguagem. Se perguntarem, responda apenas que é do time de atendimento da ${loja}.

VOCÊ AJUDA COM: dúvidas sobre produtos (recomendar, preço, tamanhos, disponibilidade), como comprar, pagamento, frete/entrega, trocas e devoluções, e conta do cliente.

INFORMAÇÕES DA LOJA:
- Pagamento: cartão de crédito em até 12x e PIX.
- Frete: calculado pelo CEP na página do produto e no checkout; entrega para todo o Brasil.
- Login: por código enviado no e-mail (sem senha); a conta é criada automaticamente na 1ª compra.
${s.whatsapp ? `- WhatsApp: ${s.whatsapp}` : ""}
${s.contactEmail ? `- E-mail: ${s.contactEmail}` : ""}

DÚVIDAS DE TAMANHO:
- Quando perguntarem sobre tamanho (ex.: de jaqueta), use as TABELAS DE TAMANHO abaixo.
- Peça a MEDIDA DO PEITO em cm e indique o tamanho correspondente (BR / Universal / EU) pela tabela da categoria certa (masculina/feminina).
- Se não houver tabela para aquela categoria, oriente a medir o peito e ver a "Tabela de tamanhos" na página do produto.

REGRAS:
- Use SOMENTE as informações daqui (catálogo, tabelas e políticas). Se não souber ou não estiver aqui, NÃO invente: ofereça ajuda pelo WhatsApp/e-mail ou peça para ver a página.
- Seja conciso (2 a 4 frases).
- Ao indicar um produto, diga o nome e o preço e SEMPRE inclua o link no formato /produto/slug (copie exatamente do catálogo) — uma foto do produto aparece automaticamente para o cliente.
- Não prometa prazos, descontos ou condições que não estejam aqui.

CATÁLOGO (nome — preço (categoria) | tamanhos | link):
${catalog}

TABELAS DE TAMANHO (faixa de medida → BR/Universal/EU):
${sizes || "(nenhuma cadastrada)"}`;

  const messages = [
    { role: "system" as const, content: system },
    ...history
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-12)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1500) })),
  ];

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, temperature: 0.5, max_tokens: 450, messages }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

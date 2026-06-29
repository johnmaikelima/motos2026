import "server-only";

/**
 * Integração OpenAI — classificação de produtos em CATEGORIA + SUBCATEGORIA.
 *
 * SEGURANÇA: a chave (OPENAI_API_KEY) fica só no servidor, sem NEXT_PUBLIC_.
 * Este módulo é "server-only": nunca vai para o navegador.
 */

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export function isOpenAIConfigured(): boolean {
  return (process.env.OPENAI_API_KEY ?? "").length > 0;
}

export type ClassifyInput = {
  id: string;
  nome: string;
  descricao?: string;
  grupo?: string | null;
  grandeGrupo?: string | null;
  marca?: string | null;
};

export type ClassifyOutput = { id: string; categoria: string; subcategoria: string };

const SYSTEM = `Você é um classificador de produtos de uma loja de itens para motociclistas.
Para cada produto, defina:
- "categoria": o TIPO do produto, no plural e em Title Case. Ex.: "Jaquetas", "Botas", "Luvas", "Capacetes", "Calças", "Camisetas", "Mochilas", "Acessórios", "Peças".
- "subcategoria": refinamento da categoria. Quando fizer sentido, use o gênero: "<Categoria> Masculinas", "<Categoria> Femininas" ou "<Categoria> Unissex". Se não houver gênero claro, use um refinamento útil (ex.: "Capacetes Fechados") ou repita a categoria.

Regras:
- REUTILIZE as categorias/subcategorias já existentes fornecidas sempre que couber (mantenha consistência).
- Responda SOMENTE com JSON no formato {"items":[{"id":"...","categoria":"...","subcategoria":"..."}]}.
- Mantenha categoria e subcategoria coerentes (a subcategoria pertence à categoria).`;

async function classifyBatch(
  items: ClassifyInput[],
  existing: { categorias: string[]; subcategorias: string[] }
): Promise<ClassifyOutput[]> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const userPayload = {
    categorias_existentes: existing.categorias,
    subcategorias_existentes: existing.subcategorias,
    produtos: items.map((i) => ({
      id: i.id,
      nome: i.nome,
      descricao: (i.descricao ?? "").slice(0, 200),
      grupo: i.grupo ?? "",
      grande_grupo: i.grandeGrupo ?? "",
      marca: i.marca ?? "",
    })),
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: { items?: ClassifyOutput[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Resposta da OpenAI não é JSON válido.");
  }
  return (parsed.items ?? [])
    .filter((x) => x && x.id && x.categoria)
    .map((x) => ({
      id: String(x.id),
      categoria: String(x.categoria).trim(),
      subcategoria: String(x.subcategoria || x.categoria).trim(),
    }));
}

/** Classifica uma lista de produtos em lotes. */
export async function classifyProducts(
  items: ClassifyInput[],
  existing: { categorias: string[]; subcategorias: string[] },
  batchSize = 30
): Promise<ClassifyOutput[]> {
  const out: ClassifyOutput[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const res = await classifyBatch(batch, existing);
    out.push(...res);
    // alimenta as categorias recém-criadas de volta para manter consistência entre lotes
    for (const r of res) {
      if (!existing.categorias.includes(r.categoria)) existing.categorias.push(r.categoria);
      if (!existing.subcategorias.includes(r.subcategoria)) existing.subcategorias.push(r.subcategoria);
    }
  }
  return out;
}

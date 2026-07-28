/**
 * Agrupamento de variações e geração de nome amigável a partir da planilha.
 *
 * Regra (definida com o cliente): 1 PRODUTO por (nome-base + COR).
 * A variação é o TAMANHO. SKUs com a mesma base e a mesma cor são o mesmo produto.
 *
 * O nome amigável é um RASCUNHO automático (expande abreviações, corrige acentos,
 * Title Case). O que não ficar 100% é ajustado na tela de revisão — e o dicionário
 * abaixo pode crescer para melhorar todos os produtos de uma vez.
 */

// Tokens de tamanho (removidos do nome para achar a base).
const SIZE_TOKENS = new Set([
  "PP", "P", "M", "G", "GG", "GGG", "XG", "XGG", "XGGG", "U", "UN", "UNICO", "UNI",
  "XS", "S", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL",
  "2XL", "3XL", "4XL", "5XL", "6XL", "7XL",
]);

// Abreviações de cor -> usadas para remover a cor do nome (a cor vem da coluna G).
const COLOR_ABBR: Record<string, string[]> = {
  PRETO: ["PRET", "PT", "PRTO", "PRT", "PR", "BLACK"],
  BRANCO: ["BCO", "BR", "BCA", "BC", "WHITE"],
  VERMELHO: ["VERM", "VM", "VRM", "RED"],
  AZUL: ["AZ", "AZUL", "BLUE"],
  CINZA: ["CZ", "CINZA", "CHUMBO", "GREY", "GRAY"],
  VERDE: ["VD", "VERD", "VERDE", "GREEN"],
  AMARELO: ["AM", "AMAR", "AMARELO", "YELLOW"],
  LARANJA: ["LJ", "LAR", "LARANJA", "ORANGE"],
  ROSA: ["RS", "ROSA", "PINK"],
  GRAFITE: ["GRAF", "GRAFITE"],
  MARROM: ["MAR", "MARROM", "BROWN"],
  PRATA: ["PRATA", "SILVER"],
  DOURADO: ["DOUR", "DOURADO", "GOLD"],
  VINHO: ["VINHO"],
  BEGE: ["BEGE"],
};

// Expansão de abreviações comuns + correção de acentos no nome amigável.
const EXPAND: Record<string, string> = {
  MASC: "Masculina",
  MAS: "Masculina",
  FEM: "Feminina",
  LD: "Lady",
  INF: "Infantil",
  UNI: "Unissex",
  IMP: "Impermeável",
  CALCA: "Calça",
  JAQUETA: "Jaqueta",
  CAMISETA: "Camiseta",
  BERMUDA: "Bermuda",
  JOELHEIRA: "Joelheira",
  COTOVELEIRA: "Cotoveleira",
  PROTECAO: "Proteção",
  PROTETOR: "Protetor",
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export type ParsedVariant = {
  baseKey: string; // chave de agrupamento (base + cor), normalizada
  friendlyName: string; // nome amigável (rascunho)
  size: string | null; // tamanho da variação (coluna H)
  color: string | null; // cor (coluna G)
};

/**
 * @param nome  Descrição (coluna C)
 * @param cor   Cor (coluna G)
 * @param tam   Tamanho (coluna H)
 */
export function parseVariant(nome: string, cor: string, tam: string): ParsedVariant {
  const color = (cor || "").trim() || null;
  const size = (tam || "").trim() || null;

  let tokens = (nome || "").toUpperCase().split(/\s+/).filter(Boolean);

  // 1) remove os tokens de tamanho do FIM do nome (inclui o valor exato de H).
  const tamUp = (size || "").toUpperCase();
  while (tokens.length && (SIZE_TOKENS.has(tokens[tokens.length - 1]) || tokens[tokens.length - 1] === tamUp)) {
    tokens.pop();
  }

  // 2) remove a cor do nome (abreviações da cor da coluna G).
  if (color) {
    const colorUp = stripAccents(color.toUpperCase());
    const abbrs = new Set<string>([color.toUpperCase(), colorUp, ...(COLOR_ABBR[colorUp] || [])]);
    tokens = tokens.filter((t) => !abbrs.has(t) && !abbrs.has(stripAccents(t)));
  }

  const baseTokens = tokens;
  const baseNorm = stripAccents(baseTokens.join(" "))
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // chave de agrupamento inclui a cor (1 produto por base + cor)
  const baseKey = `${baseNorm}::${(color || "").toLowerCase()}`;

  // nome amigável: expande abreviações + Title Case + acrescenta a cor
  const expanded = baseTokens.map((t) => EXPAND[t] || EXPAND[stripAccents(t)] || titleCase(t)).join(" ");
  const colorWord = color ? titleCase(color) : "";
  const friendlyName = [expanded, colorWord].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  return { baseKey, friendlyName, size, color };
}

/** Slug curto e único a partir do baseKey. */
export function variantSlug(baseKey: string): string {
  return baseKey
    .replace("::", "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

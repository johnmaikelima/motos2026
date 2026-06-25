/**
 * Embeleza o nome cru da planilha (CAIXA ALTA, abreviado, sem acento) para um
 * título amigável usado no site E no feed do Google Shopping.
 *
 *   "CALCA TEXX ARMOR LD FEM PRETA"  ->  "Calça TEXX Armor LD Feminina Preta"
 *
 * É conservador: só expande abreviações de ALTA confiança e preserva siglas
 * (TEXX, LD, V2...). Idempotente — rodar de novo num nome já tratado não estraga.
 */

// Siglas/tokens que devem permanecer em CAIXA ALTA.
const KEEP_UPPER = new Set([
  "TEXX", "UK", "US", "GP", "DOT", "ECE", "RX", "HD",
]);

// Abreviações expandidas (chave = token normalizado: sem acento, só A-Z0-9).
const EXPAND: Record<string, string> = {
  CALCA: "Calça",
  LD: "Lady",
  FEM: "Feminina",
  MASC: "Masculina",
  INF: "Infantil",
  TITANIO: "Titânio",
  ESCAM: "Escamoteável",
  ESC: "Escamoteável",
  FECHA: "Fechado",
};

// Palavras curtas que ficam minúsculas no meio do título.
const LOWER_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "com", "para", "sem", "no", "na"]);

function normalize(token: string): string {
  return token
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acentos (diacríticos combinantes)
    .replace(/[^A-Z0-9]/g, ""); // tira pontuação e o caractere quebrado
}

function titleCase(token: string): string {
  const lower = token.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function prettifyName(raw: string): string {
  if (!raw) return raw;
  const tokens = raw.trim().split(/\s+/);

  return tokens
    .map((token, i) => {
      const upper = token.toUpperCase();

      // Versões: V2, V3, V10...
      if (/^V\d+$/.test(upper)) return upper;
      // Siglas preservadas
      if (KEEP_UPPER.has(upper)) return upper;

      const norm = normalize(token);
      if (EXPAND[norm]) return EXPAND[norm];

      // Conectores minúsculos (nunca na 1ª palavra)
      if (i > 0 && LOWER_WORDS.has(token.toLowerCase())) return token.toLowerCase();

      return titleCase(token);
    })
    .join(" ");
}

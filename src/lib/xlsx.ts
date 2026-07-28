import "server-only";
import { inflateRawSync } from "node:zlib";

/**
 * Parser de XLSX mínimo e sem dependências, feito para o formato exportado
 * pela Laquila (namespace "x:", sharedStrings). Lê o ZIP, extrai a planilha
 * e devolve as linhas como objetos { A, B, C... } por letra de coluna.
 */

type ZipEntries = Record<string, Buffer>;

// Fallback: varre os cabeçalhos LOCAIS (só funciona quando o tamanho está neles).
function readZipLocal(buf: Buffer): ZipEntries {
  const out: ZipEntries = {};
  let i = 0;
  while (i < buf.length - 4) {
    if (buf.readUInt32LE(i) === 0x04034b50) {
      const method = buf.readUInt16LE(i + 8);
      const compSize = buf.readUInt32LE(i + 18);
      const nameLen = buf.readUInt16LE(i + 26);
      const extraLen = buf.readUInt16LE(i + 28);
      const name = buf.slice(i + 30, i + 30 + nameLen).toString("utf8");
      const dataStart = i + 30 + nameLen + extraLen;
      const comp = buf.slice(dataStart, dataStart + compSize);
      try {
        out[name] = method === 8 ? inflateRawSync(comp) : comp;
      } catch {
        out[name] = Buffer.alloc(0);
      }
      i = dataStart + compSize;
    } else {
      i++;
    }
  }
  return out;
}

/**
 * Lê o ZIP pelo DIRETÓRIO CENTRAL (no fim do arquivo), que sempre tem os tamanhos
 * corretos. Necessário porque alguns programas (Excel) gravam o cabeçalho local
 * com tamanho 0 e o real só no "data descriptor"/diretório central.
 */
function readZip(buf: Buffer): ZipEntries {
  // Acha o End of Central Directory (0x06054b50), varrendo do fim.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return readZipLocal(buf);

  const out: ZipEntries = {};
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  let p = cdOffset;
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString("utf8");
    // No cabeçalho LOCAL, lê nome/extra para achar onde começam os dados.
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const comp = buf.slice(dataStart, dataStart + compSize);
    try {
      out[name] = method === 8 ? inflateRawSync(comp) : comp;
    } catch {
      out[name] = Buffer.alloc(0);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Concatena todos os <t> dentro de cada <si> (cobre texto com formatação). */
function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    const texts = [...m[1].matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)];
    out.push(decodeEntities(texts.map((t) => t[1]).join("")));
  }
  return out;
}

const colLetters = (ref: string) => ref.replace(/[0-9]+/g, "");

export type XlsxRow = Record<string, string>;

/** Lê as linhas de UMA planilha (xml) já com as sharedStrings resolvidas. */
function parseSheetXml(sheet: string, shared: string[]): XlsxRow[] {
  const rows: XlsxRow[] = [];
  const rowRe = /<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g;
  // Captura os atributos do <c ...> separadamente, para ler r e t de forma confiável.
  const cellRe = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;

  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(sheet))) {
    const row: XlsxRow = {};
    const body = rm[1];
    let cm: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cm = cellRe.exec(body))) {
      const attrs = cm[1] ?? "";
      const refM = attrs.match(/r="([A-Z]+)\d+"/);
      if (!refM) continue;
      const col = colLetters(refM[1]);
      const type = (attrs.match(/t="([^"]*)"/) ?? [])[1];
      const content = cm[2] ?? "";
      let value = "";
      if (type === "inlineStr") {
        const t = content.match(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/);
        value = t ? decodeEntities(t[1]) : "";
      } else {
        const v = content.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/);
        const raw = v ? v[1] : "";
        if (type === "s") {
          value = shared[parseInt(raw, 10)] ?? "";
        } else {
          value = decodeEntities(raw);
        }
      }
      row[col] = value.trim();
    }
    rows.push(row);
  }
  return rows;
}

function sortedSheetNames(zip: ZipEntries): string[] {
  return Object.keys(zip)
    .filter((k) => /xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => {
      const na = Number(a.match(/sheet(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/sheet(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });
}

/** Lê a PRIMEIRA planilha (usado na importação do catálogo da Laquila). */
export function parseXlsx(buf: Buffer): XlsxRow[] {
  const zip = readZip(buf);
  const ssEntry = zip["xl/sharedStrings.xml"];
  const shared = ssEntry ? parseSharedStrings(ssEntry.toString("utf8")) : [];
  const sheetName = sortedSheetNames(zip)[0] ?? Object.keys(zip).find((k) => /xl\/worksheets\/.*\.xml$/.test(k));
  if (!sheetName) return [];
  return parseSheetXml(zip[sheetName].toString("utf8"), shared);
}

/** Lê TODAS as planilhas (abas) e concatena as linhas. */
export function parseXlsxAllSheets(buf: Buffer): XlsxRow[] {
  const zip = readZip(buf);
  const ssEntry = zip["xl/sharedStrings.xml"];
  const shared = ssEntry ? parseSharedStrings(ssEntry.toString("utf8")) : [];
  const all: XlsxRow[] = [];
  for (const name of sortedSheetNames(zip)) {
    all.push(...parseSheetXml(zip[name].toString("utf8"), shared));
  }
  return all;
}

/** Converte texto numérico (ponto OU vírgula decimal) para number. */
export function num(input: string | undefined): number {
  if (!input) return 0;
  const s = input.trim().replace(/\s/g, "");
  // Se tem vírgula e ponto, assume ponto=milhar e vírgula=decimal.
  const normalized =
    s.includes(",") && s.includes(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

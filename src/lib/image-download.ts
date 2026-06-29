import "server-only";
import { writeFile, mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Baixa uma imagem remota para /public/uploads e devolve a URL pública local
 * (/uploads/<arquivo>). É idempotente: o nome é derivado da URL (hash), então
 * se o arquivo já existe no disco, não baixa de novo.
 *
 * Em caso de falha (rede, 404, não-imagem) devolve a URL original — a loja
 * continua funcionando, só sem localizar aquela imagem.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function isRemote(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Detecta o formato pelos BYTES do arquivo (magic numbers). Devolve a extensão
 * ou null se não for uma imagem de verdade. É isso que evita salvar um HTML/erro
 * com cara de .jpg (causa do "isn't a valid image ... received null" no next/image).
 */
function imageExtFromBytes(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg"; // JPEG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png"; // PNG
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif"; // GIF
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (b.toString("ascii", 4, 8) === "ftyp") {
    const brand = b.toString("ascii", 8, 12);
    if (brand.startsWith("avif") || brand.startsWith("avis") || brand.startsWith("mif1")) return "avif";
  }
  return null;
}

function extFromUrl(url: string): string {
  try {
    const p = new URL(url).pathname;
    const e = path.extname(p).replace(".", "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return e || "";
  } catch {
    return "";
  }
}

/** Converte uma URL remota em arquivo local; mantém locais/placeholder como estão. */
export async function localizeImage(url: string): Promise<string> {
  const clean = (url || "").trim();
  if (!clean || !isRemote(clean)) return clean; // já local, vazio ou placeholder

  const hash = crypto.createHash("sha1").update(clean).digest("hex").slice(0, 16);
  const urlExt = extFromUrl(clean);

  // Se já existe no disco E for uma imagem válida, reaproveita.
  // Se existir mas estiver QUEBRADO, apaga e baixa de novo (auto-correção).
  for (const ext of [urlExt, "jpg", "png", "webp", "gif", "avif"].filter(Boolean)) {
    const candidate = `laquila-${hash}.${ext}`;
    const full = path.join(UPLOAD_DIR, candidate);
    try {
      const existing = await readFile(full);
      if (imageExtFromBytes(existing)) return `/uploads/${candidate}`;
      await unlink(full).catch(() => {}); // arquivo inválido: remove
    } catch {
      /* não existe; segue */
    }
  }

  try {
    const res = await fetch(clean, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return clean;
    const buf = Buffer.from(await res.arrayBuffer());

    // Valida pelos BYTES (não confia no content-type). Se não for imagem real,
    // NÃO salva — devolve a URL original para não gerar um /uploads quebrado.
    const ext = imageExtFromBytes(buf);
    if (!ext) return clean;

    const name = `laquila-${hash}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), buf);
    return `/uploads/${name}`;
  } catch {
    return clean; // mantém a URL remota em caso de erro
  }
}

/**
 * Diz se uma imagem LOCAL (/uploads/...) existe e é uma imagem válida.
 * Remoto/placeholder/vazio são considerados "válidos" (não são alvo de reparo local).
 * Arquivo faltando ou corrompido => false.
 */
export async function isLocalImageValid(publicUrl: string): Promise<boolean> {
  const u = (publicUrl || "").trim();
  if (!u || u === "/placeholder.svg") return true;
  if (/^https?:\/\//i.test(u)) return true;
  if (!u.startsWith("/uploads/")) return true;
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, u.replace(/^\/uploads\//, "")));
    return imageExtFromBytes(buf) !== null;
  } catch {
    return false;
  }
}

/** Localiza uma lista de URLs (com cache no próprio array para evitar repetição). */
export async function localizeMany(urls: string[]): Promise<string[]> {
  const out: string[] = [];
  const cache = new Map<string, string>();
  for (const u of urls) {
    if (cache.has(u)) {
      out.push(cache.get(u)!);
      continue;
    }
    const local = await localizeImage(u);
    cache.set(u, local);
    out.push(local);
  }
  return out;
}

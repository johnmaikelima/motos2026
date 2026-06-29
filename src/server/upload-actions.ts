"use server";

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Upload de imagem de produto.
 * Salva o arquivo em /public/uploads e devolve a URL pública (/uploads/<arquivo>).
 * Roda só no servidor. Em produção em hosts read-only (ex.: Vercel) é preciso
 * trocar por um storage externo (S3/Cloudinary); localmente (Laragon) funciona.
 */

export type UploadResult = { ok: boolean; url?: string; message?: string };

const MAX = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file");
    if (!file || typeof file === "string") return { ok: false, message: "Nenhum arquivo enviado." };
    const f = file as File;
    if (!ALLOWED.includes(f.type)) return { ok: false, message: "Formato inválido (use JPG, PNG, WEBP ou GIF)." };
    if (f.size > MAX) return { ok: false, message: "Imagem muito grande (máx. 8 MB)." };

    const buf = Buffer.from(await f.arrayBuffer());
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const name = `${crypto.randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);

    return { ok: true, url: `/uploads/${name}` };
  } catch (err) {
    console.warn("[upload] uploadProductImage:", (err as Error)?.message);
    return { ok: false, message: "Erro ao enviar a imagem." };
  }
}

/**
 * Upload do LOGO da loja.
 * Em produção (container Coolify) o filesystem é efêmero e /public/uploads
 * não é servido de forma confiável — então o logo é guardado INLINE no banco
 * como data URL (base64). É uma imagem pequena e única, então cabe sem problema
 * e sempre renderiza (sem filesystem, sem volume, sem otimizador de imagem).
 */
const LOGO_MAX = 1 * 1024 * 1024; // 1 MB (vira texto no banco e no HTML de toda página)

export async function uploadLogo(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file");
    if (!file || typeof file === "string") return { ok: false, message: "Nenhum arquivo enviado." };
    const f = file as File;
    if (!ALLOWED.includes(f.type)) return { ok: false, message: "Formato inválido (use JPG, PNG ou WEBP)." };
    if (f.size > LOGO_MAX) return { ok: false, message: "Logo muito grande (máx. 1 MB). Otimize a imagem." };

    const buf = Buffer.from(await f.arrayBuffer());
    const dataUrl = `data:${f.type};base64,${buf.toString("base64")}`;
    return { ok: true, url: dataUrl };
  } catch (err) {
    console.warn("[upload] uploadLogo:", (err as Error)?.message);
    return { ok: false, message: "Erro ao enviar o logo." };
  }
}

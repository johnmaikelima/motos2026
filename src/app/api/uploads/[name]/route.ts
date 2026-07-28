import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Serve as imagens enviadas (logo/produtos) a partir de /public/uploads.
 * Em produção (container Coolify), o serviço estático do Next não entrega
 * arquivos gravados em runtime — então lemos e devolvemos o arquivo aqui.
 * IMPORTANTE: para persistir entre deploys, /public/uploads deve estar num
 * VOLUME PERSISTENTE no Coolify (senão as imagens somem a cada redeploy).
 */
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // Segurança: só o nome do arquivo, sem travessia de diretório.
  const safe = path.basename(name);
  if (safe !== name || name.includes("..")) return new Response("Not found", { status: 404 });
  const ext = (name.split(".").pop() || "").toLowerCase();
  const type = TYPES[ext];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    const buf = await readFile(path.join(process.cwd(), "public", "uploads", safe));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

// Sincronização de estoque agendada (cron). Protegida por CRON_SECRET.
// Agende no Coolify (Scheduled Tasks):
//   curl -s "https://SEU_DOMINIO/api/cron/sync-stock?key=SEU_CRON_SECRET"
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { syncStockFromApi } from "@/lib/stock-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function GET(req: Request) {
  // Aceita a chave via header (preferível) ou query string.
  const key = req.headers.get("x-cron-key") || new URL(req.url).searchParams.get("key") || "";
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ ok: false, message: "CRON_SECRET não configurado." }, { status: 500 });
  }
  if (!safeEqual(key, secret)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const r = await syncStockFromApi("cron");
  return NextResponse.json(r);
}

import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "./db";

/**
 * Sessão do CLIENTE (loja) — cookie httpOnly assinado (HMAC).
 * Não guarda senha; identifica o cliente logado por código no e-mail.
 */

/**
 * Segredo para assinar sessões/códigos. Em PRODUÇÃO, se AUTH_SECRET (ou
 * ADMIN_SESSION_TOKEN) não estiver definido, usa um segredo ALEATÓRIO por boot
 * (seguro, mas desloga todos a cada reinício) e registra um alerta — nunca um
 * fallback fixo/previsível.
 */
function resolveSecret(): string {
  const s = process.env.AUTH_SECRET || process.env.ADMIN_SESSION_TOKEN;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    console.error("[SEGURANÇA] AUTH_SECRET ausente/curto em produção. Usando segredo aleatório (sessões expiram a cada reinício). DEFINA AUTH_SECRET!");
    return crypto.randomBytes(32).toString("hex");
  }
  return "dev-insecure-secret-troque";
}

export const AUTH_SECRET = resolveSecret();
const SECRET = AUTH_SECRET;
const COOKIE = "rm_customer";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export async function setSessionCookie(customerId: string): Promise<void> {
  const payload = `${customerId}.${Date.now() + MAX_AGE * 1000}`;
  const token = `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getCustomerId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const payload = Buffer.from(b64, "base64url").toString();
  if (sign(payload) !== sig) return null;
  const [cid, expStr] = payload.split(".");
  if (!cid || !expStr || Date.now() > Number(expStr)) return null;
  return cid;
}

export async function getCurrentCustomer() {
  const id = await getCustomerId();
  if (!id) return null;
  try {
    return await prisma.customer.findUnique({ where: { id } });
  } catch (err) {
    // Banco offline/sem tabelas: não derruba o site inteiro (header está em todo lugar).
    console.warn("[session] getCurrentCustomer:", (err as Error)?.message);
    return null;
  }
}

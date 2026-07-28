import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Verificação de admin para Server Actions (defesa em profundidade).
 * Reaproveita o MESMO cookie/token do login (rm_admin == ADMIN_SESSION_TOKEN).
 * Não cria usuário nem muda o login — só re-checa dentro de cada action sensível.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get("rm_admin")?.value;
  const expected = process.env.ADMIN_SESSION_TOKEN;
  return !!expected && !!token && safeEqual(token, expected);
}

/** Lança "Não autorizado" se não for admin. Chame no início das actions de admin. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Não autorizado.");
}

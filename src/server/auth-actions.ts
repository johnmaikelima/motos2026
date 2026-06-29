"use server";

import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendLoginCode, isEmailConfigured } from "@/lib/email";
import { setSessionCookie, clearSessionCookie, getCurrentCustomer, AUTH_SECRET } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

const SECRET = AUTH_SECRET;

function hashCode(email: string, code: string): string {
  return crypto.createHmac("sha256", SECRET).update(`${email}:${code}`).digest("hex");
}

const isEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

export type AuthResult = { ok: boolean; message: string };

/** Gera e envia um código de 6 dígitos para o e-mail. */
export async function requestLoginCode(email: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  if (!isEmail(e)) return { ok: false, message: "E-mail inválido." };
  if (!isEmailConfigured()) return { ok: false, message: "Envio de e-mail ainda não configurado." };
  // Rate limit: no máx. 5 códigos por e-mail a cada 10 min (evita email bombing).
  if (!rateLimit(`logincode:${e}`, 5, 10 * 60 * 1000)) {
    return { ok: false, message: "Muitas solicitações. Aguarde alguns minutos e tente de novo." };
  }
  try {
    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.loginCode.deleteMany({ where: { email: e } });
    await prisma.loginCode.create({
      data: { email: e, codeHash: hashCode(e, code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    await sendLoginCode(e, code);
    return { ok: true, message: "Código enviado para o seu e-mail." };
  } catch (err) {
    console.warn("[auth] requestLoginCode:", (err as Error)?.message);
    return { ok: false, message: "Não foi possível enviar o código. Tente novamente." };
  }
}

export type VerifyResult =
  | { ok: true; data: MyData }
  | { ok: false; message: string };

/** Verifica o código, cria/recupera o cliente e inicia a sessão. */
export async function verifyLoginCode(email: string, code: string): Promise<VerifyResult> {
  const e = email.trim().toLowerCase();
  const c = code.trim();
  try {
    const rec = await prisma.loginCode.findFirst({ where: { email: e }, orderBy: { createdAt: "desc" } });
    if (!rec) return { ok: false, message: "Solicite um novo código." };
    if (rec.expiresAt < new Date()) return { ok: false, message: "Código expirado. Solicite outro." };
    if (rec.attempts >= 5) return { ok: false, message: "Muitas tentativas. Solicite outro código." };
    if (rec.codeHash !== hashCode(e, c)) {
      await prisma.loginCode.update({ where: { id: rec.id }, data: { attempts: rec.attempts + 1 } });
      return { ok: false, message: "Código incorreto." };
    }
    await prisma.loginCode.deleteMany({ where: { email: e } });
    const customer = await prisma.customer.upsert({ where: { email: e }, update: {}, create: { email: e } });
    await setSessionCookie(customer.id);
    return { ok: true, data: toMyData(customer) };
  } catch (err) {
    console.warn("[auth] verifyLoginCode:", (err as Error)?.message);
    return { ok: false, message: "Erro ao verificar o código." };
  }
}

export async function logoutCustomer(): Promise<void> {
  await clearSessionCookie();
}

export type MyData = {
  email: string;
  name: string;
  cpf: string;
  phone: string;
  cep: string;
  address: string;
  addressNumber: string;
  city: string;
  uf: string;
};

function toMyData(c: {
  email: string; name: string | null; cpf: string | null; phone: string | null;
  cep: string | null; address: string | null; addressNumber: string | null; city: string | null; uf: string | null;
}): MyData {
  return {
    email: c.email,
    name: c.name ?? "",
    cpf: c.cpf ?? "",
    phone: c.phone ?? "",
    cep: c.cep ?? "",
    address: c.address ?? "",
    addressNumber: c.addressNumber ?? "",
    city: c.city ?? "",
    uf: c.uf ?? "",
  };
}

/** Dados do cliente logado (para preencher o checkout). null se não logado. */
export async function getMyData(): Promise<MyData | null> {
  const c = await getCurrentCustomer();
  return c ? toMyData(c) : null;
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Autenticação simples do painel administrativo — TUDO no servidor.
 *
 * - A senha (ADMIN_PASSWORD) e o token de sessão (ADMIN_SESSION_TOKEN) vêm de
 *   variáveis de ambiente, sem NEXT_PUBLIC_, então nunca chegam ao navegador.
 * - O cookie é httpOnly (JavaScript do navegador não consegue ler) e sameSite=strict.
 * - O middleware ([src/middleware.ts]) compara o cookie com o token a cada request.
 *
 * Para algo mais robusto no futuro: usuários no banco, hash de senha (bcrypt),
 * e provedores como Auth.js. Para um MVP de 1 dono de loja, isto já é seguro.
 */

const COOKIE_NAME = "rm_admin";

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const token = process.env.ADMIN_SESSION_TOKEN ?? "";

  if (!expected || !token) {
    return { error: "Defina ADMIN_PASSWORD e ADMIN_SESSION_TOKEN no .env.local." };
  }
  if (password !== expected) {
    return { error: "Senha incorreta." };
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });

  redirect("/admin/pedidos");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/admin-login");
}

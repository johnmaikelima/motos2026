"use server";

import { requireAdmin } from "./admin-guard";
import { sendTestEmail, getEmailConfig, type EmailConfigInfo } from "@/lib/email";

export type TestEmailResult = { ok: boolean; message: string };

/** Dispara um e-mail de teste (somente admin). */
export async function sendTestEmailAction(to: string): Promise<TestEmailResult> {
  await requireAdmin();
  const dest = (to || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) {
    return { ok: false, message: "Informe um e-mail de destino válido." };
  }
  try {
    await sendTestEmail(dest);
    return { ok: true, message: `E-mail de teste enviado para ${dest}. Confira a caixa de entrada (e o spam).` };
  } catch (err) {
    return { ok: false, message: (err as Error)?.message ?? "Falha ao enviar o e-mail." };
  }
}

/** Resumo (sem senha) da config de e-mail atual (somente admin). */
export async function getEmailConfigAction(): Promise<EmailConfigInfo> {
  await requireAdmin();
  return getEmailConfig();
}

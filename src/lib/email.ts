import "server-only";
import nodemailer from "nodemailer";

/**
 * Envio de e-mail via Gmail (SMTP).
 * Requer uma SENHA DE APP do Google (não a senha normal) — ver README/.env.example.
 * Credenciais ficam só no servidor.
 */

const USER = process.env.GMAIL_USER ?? "";
const PASS = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s/g, ""); // senha de app vem com espaços
const FROM_NAME = process.env.MAIL_FROM_NAME ?? "RunMotos";

export function isEmailConfigured(): boolean {
  return USER.length > 0 && PASS.length > 0;
}

function transport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: USER, pass: PASS },
  });
}

export async function sendLoginCode(email: string, code: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error("E-mail não configurado (GMAIL_USER/GMAIL_APP_PASSWORD).");
  }
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0c0f;color:#e7e9ec;border-radius:12px">
    <h1 style="margin:0 0 8px;font-size:22px"><span style="color:#fff">Run</span><span style="color:#c4f000">Motos</span></h1>
    <p style="color:#9aa3ad;margin:0 0 20px">Seu código de acesso:</p>
    <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#c4f000;background:#13171c;border:1px solid #232932;border-radius:10px;padding:16px;text-align:center">${code}</div>
    <p style="color:#9aa3ad;margin:20px 0 0;font-size:13px">O código expira em 10 minutos. Se não foi você, ignore este e-mail.</p>
  </div>`;
  await transport().sendMail({
    from: `"${FROM_NAME}" <${USER}>`,
    to: email,
    subject: `Seu código de acesso RunMotos: ${code}`,
    text: `Seu código de acesso RunMotos é: ${code}\nExpira em 10 minutos. Se não foi você, ignore este e-mail.`,
    html,
  });
}

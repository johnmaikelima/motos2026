import "server-only";
import nodemailer from "nodemailer";

/**
 * Envio de e-mail via SMTP (qualquer provedor: domínio próprio, Gmail, etc.).
 * Credenciais ficam só no servidor.
 *
 * Configuração por variáveis de ambiente (preferencial — SMTP do seu domínio):
 *   SMTP_HOST     ex.: smtp.seudominio.com.br  (ou mail.seudominio.com.br)
 *   SMTP_PORT     465 (SSL) ou 587 (STARTTLS)
 *   SMTP_USER     ex.: contato@seudominio.com.br
 *   SMTP_PASS     senha da caixa de e-mail
 *   MAIL_FROM     (opcional) remetente; padrão = SMTP_USER
 *   MAIL_FROM_NAME (opcional) nome exibido; padrão = "RunMotos"
 *
 * Compatibilidade: se SMTP_* não estiver definido, usa GMAIL_USER/GMAIL_APP_PASSWORD
 * (senha de APP do Google) em smtp.gmail.com:465.
 */

// Usa o SMTP do domínio só quando user E senha estão preenchidos;
// caso contrário cai no Gmail (assim, SMTP_PASS vazio não derruba o login).
const USE_SMTP = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
const USER = USE_SMTP ? process.env.SMTP_USER! : process.env.GMAIL_USER ?? "";
const PASS = (USE_SMTP ? process.env.SMTP_PASS! : process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s/g, "");
const HOST = USE_SMTP ? process.env.SMTP_HOST ?? "smtp.gmail.com" : "smtp.gmail.com";
const PORT = USE_SMTP ? Number(process.env.SMTP_PORT ?? 465) : 465;
const FROM_NAME = process.env.MAIL_FROM_NAME ?? "RunMotos";
const FROM_ADDR = (USE_SMTP ? process.env.MAIL_FROM ?? USER : USER) || USER;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || FROM_ADDR;
// Servidores de e-mail próprios (ex.: CyberPanel) costumam ter certificado
// autoassinado. Quando SMTP_INSECURE_TLS=true, aceitamos esse certificado.
const INSECURE_TLS = process.env.SMTP_INSECURE_TLS === "true";

export function isEmailConfigured(): boolean {
  return USER.length > 0 && PASS.length > 0;
}

function transport() {
  return nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465, // 465 = SSL direto; 587 = STARTTLS
    auth: { user: USER, pass: PASS },
    ...(INSECURE_TLS ? { tls: { rejectUnauthorized: false } } : {}),
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
    from: `"${FROM_NAME}" <${FROM_ADDR}>`,
    to: email,
    subject: `Seu código de acesso RunMotos: ${code}`,
    text: `Seu código de acesso RunMotos é: ${code}\nExpira em 10 minutos. Se não foi você, ignore este e-mail.`,
    html,
  });
}

/* ----------------------------- NOTIFICAÇÕES DE PEDIDO ----------------------------- */

export type OrderEmailItem = { name: string; size?: string | null; qty: number; price: number };
export type OrderEmailData = {
  number: number;
  customerName: string;
  email: string;
  items: OrderEmailItem[];
  subtotal: number;
  shipping: number;
  total: number;
  discount?: number;
  address?: { street?: string | null; number?: string | null; city?: string | null; uf?: string | null; cep?: string | null };
};

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Layout base (dark + lime), com cabeçalho da marca e rodapé. */
function layout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0c0f;color:#e7e9ec;border-radius:12px">
    <h1 style="margin:0 0 4px;font-size:22px"><span style="color:#fff">Run</span><span style="color:#c4f000">Motos</span></h1>
    <h2 style="margin:0 0 16px;font-size:16px;color:#c4f000">${title}</h2>
    ${bodyHtml}
    <p style="color:#6b7280;margin:24px 0 0;font-size:12px;border-top:1px solid #232932;padding-top:12px">
      RunMotos — equipamentos e vestuário para motociclistas.<br>Este é um e-mail automático, não responda.
    </p>
  </div>`;
}

/** Tabela de itens + totais, reutilizada em vários e-mails. */
function itemsTable(o: OrderEmailData): string {
  const rows = o.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #1c2127;color:#e7e9ec">${it.name}${it.size ? ` <span style="color:#9aa3ad">(${it.size})</span>` : ""} <span style="color:#9aa3ad">× ${it.qty}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #1c2127;color:#e7e9ec;text-align:right;white-space:nowrap">${brl(it.price * it.qty)}</td>
      </tr>`,
    )
    .join("");
  const discountRow =
    o.discount && o.discount > 0
      ? `<tr><td style="padding:4px 0;color:#9aa3ad">Desconto</td><td style="padding:4px 0;color:#9aa3ad;text-align:right">- ${brl(o.discount)}</td></tr>`
      : "";
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
      <tr><td style="padding:4px 0;color:#9aa3ad">Subtotal</td><td style="padding:4px 0;color:#9aa3ad;text-align:right">${brl(o.subtotal)}</td></tr>
      <tr><td style="padding:4px 0;color:#9aa3ad">Frete</td><td style="padding:4px 0;color:#9aa3ad;text-align:right">${brl(o.shipping)}</td></tr>
      ${discountRow}
      <tr><td style="padding:8px 0 0;color:#fff;font-weight:700;font-size:16px">Total</td><td style="padding:8px 0 0;color:#c4f000;font-weight:700;font-size:16px;text-align:right">${brl(o.total - (o.discount ?? 0))}</td></tr>
    </table>`;
}

function addressBlock(o: OrderEmailData): string {
  const a = o.address;
  if (!a || !a.street) return "";
  const line = `${a.street}${a.number ? `, ${a.number}` : ""} — ${a.city ?? ""}/${a.uf ?? ""}${a.cep ? ` — CEP ${a.cep}` : ""}`;
  return `<p style="color:#9aa3ad;margin:16px 0 0;font-size:13px"><strong style="color:#e7e9ec">Entrega:</strong><br>${line}</p>`;
}

/** Helper: não deixa falha de e-mail derrubar o fluxo do pedido. */
async function safeSend(opts: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (!isEmailConfigured() || !opts.to) return;
  try {
    await transport().sendMail({ from: `"${FROM_NAME}" <${FROM_ADDR}>`, ...opts });
  } catch (err) {
    console.warn("[email] envio falhou:", opts.subject, "—", (err as Error)?.message);
  }
}

export type ShipInfo = { carrier?: string | null; trackingCode?: string | null; labelUrl?: string | null };
type BuiltEmail = { subject: string; html: string; text: string };

/* ---- Montagem dos modelos (HTML), separada do envio — permite pré-visualizar ---- */

/** 1) Cliente — pedido recebido (aguardando pagamento). */
export function buildOrderPlaced(o: OrderEmailData): BuiltEmail {
  const body = `
    <p style="color:#9aa3ad;margin:0 0 16px">Olá, ${o.customerName.split(" ")[0]}! Recebemos seu pedido <strong style="color:#fff">#${o.number}</strong>. Assim que o pagamento for confirmado, começamos a preparar o envio.</p>
    ${itemsTable(o)}
    ${addressBlock(o)}
    <p style="color:#9aa3ad;margin:16px 0 0;font-size:13px">Acompanhe pelo site em <strong style="color:#e7e9ec">Minha Conta → Pedidos</strong>.</p>`;
  return {
    subject: `Pedido #${o.number} recebido — RunMotos`,
    html: layout("Pedido recebido", body),
    text: `Olá, ${o.customerName}! Recebemos seu pedido #${o.number}. Total: ${brl(o.total - (o.discount ?? 0))}. Assim que o pagamento for confirmado, preparamos o envio.`,
  };
}

/** 2) Cliente — pagamento aprovado. */
export function buildOrderPaid(o: OrderEmailData): BuiltEmail {
  const body = `
    <p style="color:#9aa3ad;margin:0 0 16px">Boa notícia, ${o.customerName.split(" ")[0]}! O pagamento do pedido <strong style="color:#fff">#${o.number}</strong> foi <strong style="color:#c4f000">aprovado</strong>. Já vamos preparar o envio.</p>
    ${itemsTable(o)}
    ${addressBlock(o)}`;
  return {
    subject: `Pagamento aprovado — pedido #${o.number}`,
    html: layout("Pagamento aprovado", body),
    text: `O pagamento do pedido #${o.number} foi aprovado. Já vamos preparar o envio.`,
  };
}

/** 3) Cliente — pedido enviado, com rastreio. */
export function buildOrderShipped(o: OrderEmailData, ship: ShipInfo): BuiltEmail {
  const track = ship.trackingCode
    ? `<div style="background:#13171c;border:1px solid #232932;border-radius:10px;padding:14px;margin:16px 0;text-align:center">
         <p style="margin:0 0 4px;color:#9aa3ad;font-size:12px">Código de rastreamento${ship.carrier ? ` (${ship.carrier})` : ""}</p>
         <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:2px;color:#c4f000">${ship.trackingCode}</p>
       </div>`
    : "";
  const body = `
    <p style="color:#9aa3ad;margin:0 0 8px">Seu pedido <strong style="color:#fff">#${o.number}</strong> foi <strong style="color:#c4f000">despachado</strong>! 🏍️</p>
    ${track}
    <p style="color:#9aa3ad;margin:0 0 16px;font-size:13px">Use o código no site da transportadora para acompanhar a entrega. As atualizações também ficam em <strong style="color:#e7e9ec">Minha Conta → Pedidos</strong>.</p>
    ${itemsTable(o)}
    ${addressBlock(o)}`;
  return {
    subject: `Pedido #${o.number} enviado${ship.trackingCode ? ` — rastreio ${ship.trackingCode}` : ""}`,
    html: layout("Pedido enviado", body),
    text: `Seu pedido #${o.number} foi enviado.${ship.trackingCode ? ` Rastreio: ${ship.trackingCode} (${ship.carrier ?? ""}).` : ""}`,
  };
}

/** 4) Admin — novo pedido. */
export function buildNewOrderAdmin(o: OrderEmailData): BuiltEmail {
  const body = `
    <p style="color:#9aa3ad;margin:0 0 16px">Novo pedido <strong style="color:#fff">#${o.number}</strong> de <strong style="color:#fff">${o.customerName}</strong> (${o.email}).</p>
    ${itemsTable(o)}
    ${addressBlock(o)}
    <p style="color:#9aa3ad;margin:16px 0 0;font-size:13px">Veja os detalhes em <strong style="color:#e7e9ec">/admin/pedidos</strong>.</p>`;
  return {
    subject: `🛒 Novo pedido #${o.number} — ${brl(o.total - (o.discount ?? 0))}`,
    html: layout("Novo pedido", body),
    text: `Novo pedido #${o.number} de ${o.customerName} (${o.email}). Total: ${brl(o.total - (o.discount ?? 0))}.`,
  };
}

function buildTest(): BuiltEmail {
  const body = `
    <p style="color:#9aa3ad;margin:0 0 12px">Se você está lendo isto, o envio de e-mails da loja está <strong style="color:#c4f000">funcionando</strong>! 🎉</p>
    <p style="color:#6b7280;margin:0;font-size:12px">Enviado por <strong style="color:#e7e9ec">${FROM_ADDR}</strong> via ${HOST}:${PORT}.</p>`;
  return {
    subject: "Teste de envio — RunMotos ✅",
    html: layout("Teste de e-mail", body),
    text: "Se você recebeu este e-mail, o envio da loja está funcionando!",
  };
}

/* ---- Envio (dispara os modelos acima) ---- */

/** 1) Cliente — pedido recebido. */
export async function sendOrderPlacedCustomer(o: OrderEmailData): Promise<void> {
  await safeSend({ to: o.email, ...buildOrderPlaced(o) });
}
/** 2) Cliente — pagamento aprovado. */
export async function sendOrderPaidCustomer(o: OrderEmailData): Promise<void> {
  await safeSend({ to: o.email, ...buildOrderPaid(o) });
}
/** 3) Cliente — pedido enviado, com rastreio. */
export async function sendOrderShippedCustomer(o: OrderEmailData, ship: ShipInfo): Promise<void> {
  await safeSend({ to: o.email, ...buildOrderShipped(o, ship) });
}
/** 4) Admin — novo pedido. */
export async function sendNewOrderAdmin(o: OrderEmailData): Promise<void> {
  await safeSend({ to: ADMIN_EMAIL, ...buildNewOrderAdmin(o) });
}

/* ------------------------- MODELOS / PRÉVIA / TESTE ------------------------- */

export type EmailKind = "order_placed" | "order_paid" | "order_shipped" | "new_order_admin" | "test";

// Dados de exemplo para pré-visualizar e testar os modelos.
const SAMPLE: OrderEmailData = {
  number: 1042,
  customerName: "João da Silva",
  email: "cliente@exemplo.com",
  items: [
    { name: "Jaqueta de Couro RunMotos Preta", size: "M", qty: 1, price: 499.9 },
    { name: "Luva de Proteção X11", size: "G", qty: 2, price: 89.9 },
  ],
  subtotal: 679.7,
  shipping: 32.5,
  total: 712.2,
  discount: 34.0,
  address: { street: "Av. Ricieri Bernardi", number: "283", city: "Campina Grande do Sul", uf: "PR", cep: "83430-000" },
};
const SAMPLE_SHIP: ShipInfo = { carrier: "correios", trackingCode: "AA123456789BR" };

function buildByKind(kind: EmailKind, o: OrderEmailData): BuiltEmail {
  switch (kind) {
    case "order_placed": return buildOrderPlaced(o);
    case "order_paid": return buildOrderPaid(o);
    case "order_shipped": return buildOrderShipped(o, SAMPLE_SHIP);
    case "new_order_admin": return buildNewOrderAdmin(o);
    default: return buildTest();
  }
}

export type EmailModel = { kind: EmailKind; label: string; audience: string; subject: string; html: string };

/** Lista os modelos com HTML de exemplo — para pré-visualizar no painel. */
export function getEmailModels(): EmailModel[] {
  const defs: { kind: EmailKind; label: string; audience: string }[] = [
    { kind: "order_placed", label: "Pedido recebido", audience: "Cliente" },
    { kind: "order_paid", label: "Pagamento aprovado", audience: "Cliente" },
    { kind: "order_shipped", label: "Pedido enviado (rastreio)", audience: "Cliente" },
    { kind: "new_order_admin", label: "Novo pedido", audience: "Admin (você)" },
    { kind: "test", label: "Teste de envio", audience: "—" },
  ];
  return defs.map((d) => {
    const b = buildByKind(d.kind, SAMPLE);
    return { ...d, subject: b.subject, html: b.html };
  });
}

/** Envia UM modelo específico (com dados de exemplo) para testar a chegada. */
export async function sendModelSample(kind: EmailKind, to: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error("E-mail não configurado: defina SMTP_HOST/SMTP_USER/SMTP_PASS (ou GMAIL_USER/GMAIL_APP_PASSWORD).");
  }
  const built = buildByKind(kind, { ...SAMPLE, email: to });
  await transport().sendMail({ from: `"${FROM_NAME}" <${FROM_ADDR}>`, to, ...built });
}

/* ------------------------------- TESTE / DIAGNÓSTICO ------------------------------- */

export type EmailConfigInfo = {
  configured: boolean;
  provider: string;
  host: string;
  port: number;
  user: string;
  from: string;
  admin: string;
  insecureTls: boolean;
};

/** Resumo (sem senha) da configuração de e-mail atual — para a página de teste. */
export function getEmailConfig(): EmailConfigInfo {
  return {
    configured: isEmailConfigured(),
    provider: USE_SMTP ? "SMTP do domínio" : "Gmail (fallback)",
    host: HOST,
    port: PORT,
    user: USER,
    from: FROM_ADDR,
    admin: ADMIN_EMAIL,
    insecureTls: INSECURE_TLS,
  };
}

/** Envia um e-mail de teste. Lança erro (com a mensagem do SMTP) se falhar. */
export async function sendTestEmail(to: string): Promise<void> {
  await sendModelSample("test", to);
}

import { getEmailConfig } from "@/lib/email";
import TestEmailForm from "@/components/admin/TestEmailForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teste de e-mail" };

export default function EmailTestePage() {
  const cfg = getEmailConfig();

  const rows: { label: string; value: string }[] = [
    { label: "Status", value: cfg.configured ? "Configurado ✓" : "NÃO configurado (falta senha)" },
    { label: "Provedor", value: cfg.provider },
    { label: "Servidor (host:porta)", value: `${cfg.host}:${cfg.port}` },
    { label: "Usuário (login)", value: cfg.user || "—" },
    { label: "Remetente (de)", value: cfg.from || "—" },
    { label: "E-mail do admin (avisos)", value: cfg.admin || "—" },
    { label: "TLS autoassinado permitido", value: cfg.insecureTls ? "Sim" : "Não" },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="heading-display text-3xl text-white">Teste de e-mail</h1>
      <p className="mt-2 text-sm text-gray-400">
        Verifique se os e-mails da loja (login, confirmação de pedido, rastreio e avisos) estão saindo corretamente.
      </p>

      <div className="mt-6 card p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Configuração atual</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4">
              <dt className="text-gray-500">{r.label}</dt>
              <dd className="break-all text-right text-white">{r.value}</dd>
            </div>
          ))}
        </dl>
        {!cfg.configured && (
          <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
            Defina <strong>SMTP_HOST</strong>, <strong>SMTP_USER</strong> e <strong>SMTP_PASS</strong> nas variáveis de
            ambiente (ou as <strong>GMAIL_*</strong>) e reinicie o servidor.
          </p>
        )}
      </div>

      <div className="mt-6">
        <TestEmailForm defaultTo={cfg.admin || cfg.from} />
      </div>
    </div>
  );
}

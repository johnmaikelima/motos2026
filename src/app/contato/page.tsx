import type { Metadata } from "next";
import { getStoreSettings } from "@/lib/store-settings";

export const metadata: Metadata = { title: "Contato" };
export const dynamic = "force-dynamic";

export default async function ContatoPage() {
  const s = await getStoreSettings();
  const contatos = [
    { label: "E-mail", value: s.contactEmail || s.contactPhone ? s.contactEmail : "" },
    { label: "WhatsApp", value: s.whatsapp },
    { label: "Telefone", value: s.contactPhone },
    { label: "Endereço", value: s.address },
  ].filter((c) => c.value);

  return (
    <div className="container-rm py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="heading-display text-4xl text-white">Fale com a gente</h1>
        <p className="mt-2 text-sm text-gray-400">
          Estamos aqui para ajudar. Atendimento de segunda a sexta, das 9h às 18h.
        </p>

        {contatos.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {contatos.map((c) => (
              <div key={c.label} className="card p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-lime">{c.label}</p>
                <p className="mt-1 text-sm text-white">{c.value}</p>
              </div>
            ))}
          </div>
        )}

        <form className="card mt-8 grid gap-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <input placeholder="Seu nome" className="rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none focus:border-lime/60" />
            <input placeholder="Seu e-mail" type="email" className="rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none focus:border-lime/60" />
          </div>
          <textarea placeholder="Sua mensagem" rows={5} className="rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none focus:border-lime/60" />
          <button type="submit" className="btn-primary w-max">Enviar mensagem</button>
        </form>
      </div>
    </div>
  );
}

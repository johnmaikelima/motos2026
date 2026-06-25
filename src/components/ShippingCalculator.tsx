"use client";

import { useState } from "react";
import { getShippingOptions } from "@/server/shipping-actions";
import { formatBRL } from "@/lib/format";

type Frete = { id: number; name: string; company: string; price: number; deliveryTime: number };

export default function ShippingCalculator({ slug }: { slug: string }) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [fretes, setFretes] = useState<Frete[]>([]);

  async function calc() {
    const c = cep.replace(/\D/g, "");
    if (c.length !== 8) {
      setErro("Digite um CEP válido (8 dígitos).");
      return;
    }
    setLoading(true);
    setErro("");
    setFretes([]);
    const r = await getShippingOptions(c, [{ slug, qty: 1 }]);
    setLoading(false);
    if (r.ok) setFretes(r.options);
    else setErro(r.error);
  }

  return (
    <div className="rounded-md border border-white/10 bg-ink-800 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Calcular frete e prazo</p>
      <div className="flex gap-2">
        <input
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && calc()}
          inputMode="numeric"
          placeholder="Digite seu CEP"
          className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime/60"
        />
        <button onClick={calc} disabled={loading} className="btn-outline shrink-0 disabled:opacity-50">
          {loading ? "..." : "Calcular"}
        </button>
      </div>

      {erro && <p className="mt-2 text-xs text-amber-300">{erro}</p>}

      {fretes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {fretes.map((o) => (
            <li key={o.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-300">
                {o.company} {o.name} <span className="text-xs text-gray-500">~{o.deliveryTime} dia(s)</span>
              </span>
              <span className="font-semibold text-lime">{formatBRL(o.price)}</span>
            </li>
          ))}
        </ul>
      )}
      <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] text-gray-500 hover:text-lime">
        Não sei meu CEP
      </a>
    </div>
  );
}

"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncStock, type ActionResult } from "@/server/catalog-actions";

type Change = { cdItem: string; de: number; para: number };
export type SyncLog = {
  id: string;
  createdAt: string; // ISO
  source: string;
  ok: boolean;
  checked: number;
  updated: number;
  notFound: number;
  message: string | null;
  details: Change[];
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function StockSyncPanel({ logs }: { logs: SyncLog[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  function run() {
    setResult(null);
    start(async () => {
      const r = await syncStock();
      setResult(r);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="heading-display text-xl text-white">Sincronizar estoque</h2>
            <p className="mt-1 text-sm text-gray-400">
              Busca o saldo atual na Laquila (API 00006) e atualiza o estoque de cada variação pelo SKU.
            </p>
          </div>
          <button onClick={run} disabled={pending} className="btn-primary disabled:opacity-50">
            {pending ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>
        {result && (
          <p className={`mt-3 text-sm ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="heading-display text-xl text-white">Histórico de sincronizações</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">Nenhuma sincronização ainda.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-2 py-2">Quando</th>
                  <th className="px-2 py-2">Origem</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Consultados</th>
                  <th className="px-2 py-2">Atualizados</th>
                  <th className="px-2 py-2">Fora do catálogo</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <Fragment key={l.id}>
                    <tr className="border-t border-white/5">
                      <td className="px-2 py-2 text-gray-300">{fmt(l.createdAt)}</td>
                      <td className="px-2 py-2 text-gray-400">{l.source === "cron" ? "Automático" : "Manual"}</td>
                      <td className="px-2 py-2">
                        <span className={l.ok ? "text-lime" : "text-amber-300"}>{l.ok ? "OK" : "Falhou"}</span>
                      </td>
                      <td className="px-2 py-2 text-gray-300">{l.checked}</td>
                      <td className="px-2 py-2 font-semibold text-white">{l.updated}</td>
                      <td className="px-2 py-2 text-gray-400">{l.notFound}</td>
                      <td className="px-2 py-2">
                        {l.details.length > 0 && (
                          <button onClick={() => setOpen(open === l.id ? null : l.id)} className="text-xs font-bold uppercase text-lime hover:underline">
                            {open === l.id ? "ocultar" : `ver ${l.details.length}`}
                          </button>
                        )}
                      </td>
                    </tr>
                    {open === l.id && (
                      <tr>
                        <td colSpan={7} className="px-2 pb-3">
                          {l.message && <p className="mb-2 text-xs text-gray-400">{l.message}</p>}
                          <div className="max-h-72 overflow-y-auto rounded-md border border-white/10 bg-ink-900">
                            <table className="w-full text-left text-xs">
                              <thead className="text-gray-500">
                                <tr>
                                  <th className="px-3 py-1.5">SKU</th>
                                  <th className="px-3 py-1.5">De</th>
                                  <th className="px-3 py-1.5">Para</th>
                                </tr>
                              </thead>
                              <tbody>
                                {l.details.map((c, i) => (
                                  <tr key={i} className="border-t border-white/5">
                                    <td className="px-3 py-1.5 text-gray-300">{c.cdItem}</td>
                                    <td className="px-3 py-1.5 text-gray-400">{c.de}</td>
                                    <td className={`px-3 py-1.5 font-semibold ${c.para > c.de ? "text-lime" : "text-amber-300"}`}>{c.para}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

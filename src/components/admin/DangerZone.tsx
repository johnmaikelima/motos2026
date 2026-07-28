"use client";

import { useState, useTransition } from "react";
import { deleteAllProducts, type ActionResult } from "@/server/catalog-actions";

export default function DangerZone({ total }: { total: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <div className="card border-red-500/30 p-6">
      <h2 className="heading-display text-xl text-red-300">Zona de perigo</h2>
      <p className="mt-1 text-sm text-gray-400">
        Apaga <strong>todos os {total} produto(s)</strong> e variações do banco. Use para reimportar do zero.
        As marcas/categorias e configurações são mantidas.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-md border border-red-500/50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-red-300 transition hover:bg-red-500 hover:text-white"
        >
          Excluir todos os produtos
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-red-300">Tem certeza? Isso não tem volta.</span>
          <button
            onClick={() =>
              start(async () => {
                const res = await deleteAllProducts();
                setResult(res);
                setConfirming(false);
              })
            }
            disabled={pending}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-bold uppercase text-white disabled:opacity-50"
          >
            {pending ? "Excluindo..." : "Sim, excluir tudo"}
          </button>
          <button onClick={() => setConfirming(false)} className="text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
        </div>
      )}

      {result && (
        <p className={`mt-3 text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</p>
      )}
    </div>
  );
}

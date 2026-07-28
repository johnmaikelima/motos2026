"use client";

import { useActionState } from "react";
import { importDescriptions, type ActionResult } from "@/server/catalog-actions";

export default function DescriptionsImportPanel() {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(importDescriptions, undefined);

  return (
    <div className="card p-6">
      <h2 className="heading-display text-xl text-white">Importar descrições (planilha)</h2>
      <p className="mt-1 text-sm text-gray-400">
        Planilha <strong>.xlsx</strong> com o <strong>SKU na coluna A</strong> e as{" "}
        <strong>características na coluna C</strong>. O sistema casa pelo SKU e aplica a descrição ao
        produto — as variações do mesmo produto recebem a mesma característica.
      </p>

      <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-lime file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black"
        />
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? "Importando..." : "Importar descrições"}
        </button>
      </form>

      {state && (
        <p className={`mt-3 text-sm ${state.ok ? "text-lime" : "text-amber-300"}`}>{state.message}</p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  saveCategories,
  type CategoryEdit,
  type ActionResult,
} from "@/server/catalog-actions";

type Row = CategoryEdit & { productCount: number };

export default function CategoryManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [busy, setBusy] = useState<"save" | null>(null);

  function patch(code: string, data: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, ...data } : r)));
  }

  function setDefault(code: string) {
    setRows((prev) => prev.map((r) => ({ ...r, isDefault: r.code === code })));
  }

  function save() {
    setBusy("save");
    setResult(null);
    startTransition(async () => {
      const edits: CategoryEdit[] = rows.map((r) => ({
        code: r.code,
        name: r.name,
        tagline: r.tagline,
        importEnabled: r.importEnabled,
        active: r.active,
        isDefault: r.isDefault,
      }));
      const res = await saveCategories(edits);
      setResult(res);
      setBusy(null);
    });
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="heading-display text-xl text-white">Marcas / categorias</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Vindas da planilha (coluna sub-grupo = marca). Marque <strong>Importar</strong> nas que
            você quer vender, ajuste o nome e salve. Depois clique em <strong>Importar</strong> no
            painel acima.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-md border border-white/10 bg-ink-800 p-8 text-center text-sm text-gray-400">
          Nenhuma marca ainda. Selecione a planilha acima e clique em <strong>&quot;Analisar&quot;</strong>.
        </div>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-2 py-2 font-semibold">Código</th>
                  <th className="px-2 py-2 font-semibold">Nome (você define)</th>
                  <th className="px-2 py-2 text-center font-semibold">Itens</th>
                  <th className="px-2 py-2 text-center font-semibold">Importar</th>
                  <th className="px-2 py-2 text-center font-semibold">Na loja</th>
                  <th className="px-2 py-2 text-center font-semibold">Padrão</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-b border-white/5">
                    <td className="px-2 py-2 font-mono text-xs text-gray-400">{r.code}</td>
                    <td className="px-2 py-2">
                      <input
                        value={r.name}
                        onChange={(e) => patch(r.code, { name: e.target.value })}
                        className="w-full min-w-[12rem] rounded-md border border-white/10 bg-ink-800 px-2.5 py-1.5 text-sm text-white outline-none focus:border-lime/60"
                      />
                    </td>
                    <td className="px-2 py-2 text-center text-gray-400">{r.productCount}</td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.importEnabled}
                        onChange={(e) => patch(r.code, { importEnabled: e.target.checked })}
                        className="h-4 w-4 accent-lime"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.active}
                        onChange={(e) => patch(r.code, { active: e.target.checked })}
                        className="h-4 w-4 accent-lime"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="radio"
                        name="defaultCategory"
                        checked={r.isDefault}
                        onChange={() => setDefault(r.code)}
                        className="h-4 w-4 accent-lime"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 rounded-md border border-white/10 bg-ink-800 px-4 py-2.5 text-xs text-gray-400">
            💰 <strong>Regra de preço:</strong> usa o <strong>Valor Sugerido</strong> da planilha; se não houver
            (ou for 0), o preço vira <strong>(custo + R$10,00) × 1,5</strong>.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-50">
              {busy === "save" ? "Salvando..." : "Salvar categorias"}
            </button>
            {result && (
              <span className={`text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>
                {result.message}
              </span>
            )}
          </div>
        </>
      )}

      {result && rows.length === 0 && (
        <p className={`mt-4 text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</p>
      )}
    </div>
  );
}

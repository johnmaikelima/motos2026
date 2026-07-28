"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSizeChart, deleteSizeChart, seedDefaultSizeCharts, type SizeChartResult } from "@/server/sizechart-actions";
import type { SizeChartData, SizeRow } from "@/lib/sizecharts";

const inputCls = "w-full rounded-md border border-white/10 bg-ink-800 px-2 py-1.5 text-sm text-white outline-none focus:border-lime/60";

const blankRow: SizeRow = { min: 0, max: 0, universal: "", europa: "", brasil: "" };

export default function SizeChartManager({
  charts,
  availableCategories,
}: {
  charts: SizeChartData[];
  availableCategories: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SizeChartData | null>(null);
  const [name, setName] = useState("");
  const [measureLabel, setMeasureLabel] = useState("Medida do peito (cm)");
  const [rows, setRows] = useState<SizeRow[]>([{ ...blankRow }]);
  const [cats, setCats] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SizeChartResult | null>(null);

  function startNew() {
    setEditing({ id: "", name: "", measureLabel: "Medida do peito (cm)", rows: [{ ...blankRow }], categories: [], active: true });
    setName("");
    setMeasureLabel("Medida do peito (cm)");
    setRows([{ ...blankRow }]);
    setCats([]);
    setResult(null);
  }
  function startEdit(c: SizeChartData) {
    setEditing(c);
    setName(c.name);
    setMeasureLabel(c.measureLabel);
    setRows(c.rows.length ? c.rows : [{ ...blankRow }]);
    setCats(c.categories);
    setResult(null);
  }
  function setRow(i: number, data: Partial<SizeRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...data } : r)));
  }
  function toggleCat(c: string) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function save() {
    setResult(null);
    start(async () => {
      const res = await saveSizeChart({
        id: editing?.id || undefined,
        name,
        measureLabel,
        rows: rows.filter((r) => r.max > 0),
        categories: cats,
      });
      setResult(res);
      if (res.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Lista */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="heading-display text-xl text-white">Tabelas de tamanho ({charts.length})</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => start(async () => { setResult(await seedDefaultSizeCharts()); router.refresh(); })}
              disabled={pending}
              className="btn-outline disabled:opacity-50"
            >
              Restaurar tabelas padrão
            </button>
            <button onClick={startNew} className="btn-primary">+ Nova tabela</button>
          </div>
        </div>
        {result && !editing && (
          <p className={`mt-3 text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</p>
        )}
        {charts.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">Nenhuma tabela ainda.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {charts.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-ink-800/50 p-3">
                <div>
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.rows.length} faixa(s) · {c.categories.length ? c.categories.join(", ") : "sem categorias vinculadas"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(c)} className="text-xs font-bold uppercase text-lime hover:underline">editar</button>
                  <button
                    onClick={() => start(async () => { await deleteSizeChart(c.id); router.refresh(); })}
                    className="text-xs text-gray-400 hover:text-red-400"
                  >
                    excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      {editing && (
        <div className="card p-6">
          <h2 className="heading-display text-xl text-white">{editing.id ? "Editar tabela" : "Nova tabela"}</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Nome</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Jaquetas Femininas" className={inputCls} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Rótulo da medida</span>
              <input value={measureLabel} onChange={(e) => setMeasureLabel(e.target.value)} className={inputCls} />
            </label>
          </div>

          {/* Faixas */}
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-gray-400">Faixas de medida</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-2 py-1">Med. mín</th>
                  <th className="px-2 py-1">Med. máx</th>
                  <th className="px-2 py-1">Universal</th>
                  <th className="px-2 py-1">Europa</th>
                  <th className="px-2 py-1">Brasil</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-1 py-1"><input value={r.min || ""} onChange={(e) => setRow(i, { min: Number(e.target.value) || 0 })} inputMode="numeric" className="w-20 rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white" /></td>
                    <td className="px-1 py-1"><input value={r.max || ""} onChange={(e) => setRow(i, { max: Number(e.target.value) || 0 })} inputMode="numeric" className="w-20 rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white" /></td>
                    <td className="px-1 py-1"><input value={r.universal} onChange={(e) => setRow(i, { universal: e.target.value })} className="w-20 rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white" /></td>
                    <td className="px-1 py-1"><input value={r.europa} onChange={(e) => setRow(i, { europa: e.target.value })} className="w-20 rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white" /></td>
                    <td className="px-1 py-1"><input value={r.brasil} onChange={(e) => setRow(i, { brasil: e.target.value })} className="w-20 rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white" /></td>
                    <td className="px-1 py-1"><button onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-gray-500 hover:text-red-400">x</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setRows((prev) => [...prev, { ...blankRow }])} className="btn-outline mt-2">+ Adicionar faixa</button>

          {/* Categorias vinculadas */}
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-gray-400">Aplicar nestas categorias/subcategorias</p>
          {availableCategories.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhuma categoria ainda (atribua categorias aos produtos primeiro).</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((c) => (
                <label key={c} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${cats.includes(c) ? "border-lime/60 bg-lime/10 text-white" : "border-white/15 text-gray-300"}`}>
                  <input type="checkbox" checked={cats.includes(c)} onChange={() => toggleCat(c)} className="h-3.5 w-3.5 accent-lime" />
                  {c}
                </label>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-50">{pending ? "Salvando..." : "Salvar tabela"}</button>
            <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-white">cancelar</button>
            {result && <span className={`text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

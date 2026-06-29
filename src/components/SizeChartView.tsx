"use client";

import { useEffect, useState } from "react";

type Row = { min: number; max: number; universal: string; europa: string; brasil: string };
type Chart = { name: string; measureLabel: string; rows: Row[] };

export default function SizeChartView({ chart, variant = "bar" }: { chart: Chart; variant?: "bar" | "link" }) {
  const [open, setOpen] = useState(false);
  const [medida, setMedida] = useState("");
  const [matchIdx, setMatchIdx] = useState<number | null>(null);

  // Fecha com ESC e trava o scroll do fundo enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function calcular() {
    const v = Number(medida.replace(",", "."));
    if (!v) {
      setMatchIdx(null);
      return;
    }
    const idx = chart.rows.findIndex((r) => v >= r.min && v <= r.max);
    setMatchIdx(idx);
  }

  const match = matchIdx != null && matchIdx >= 0 ? chart.rows[matchIdx] : null;

  return (
    <>
      {/* Gatilho */}
      {variant === "link" ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-lime underline-offset-2 hover:underline"
        >
          📏 Tabela de tamanhos
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-ink-800 px-4 py-3 text-sm font-semibold text-white transition hover:border-lime/50 hover:text-lime"
        >
          <span className="flex items-center gap-2">📏 Tabela de tamanhos</span>
          <span className="text-xs font-normal text-gray-400">Ver / calcular →</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink-900 shadow-2xl sm:max-w-3xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <p className="heading-display text-lg text-white">{chart.name}</p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Corpo rolável */}
            <div className="overflow-y-auto px-5 py-4">
              {/* Calcular */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <input
                  value={medida}
                  onChange={(e) => setMedida(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcular()}
                  inputMode="decimal"
                  placeholder={chart.measureLabel}
                  className="w-44 rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-lime/60"
                />
                <button onClick={calcular} className="btn-outline">Calcular</button>
                {matchIdx === -1 && <span className="text-xs text-amber-300">Fora da tabela.</span>}
                {match && (
                  <span className="text-sm text-lime">
                    Seu tamanho: <strong>{match.brasil}</strong> (BR) · {match.universal} · {match.europa} (EU)
                  </span>
                )}
              </div>

              {/* Tabela (faixas como colunas) — rola só dentro do modal */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-center text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 border border-white/10 bg-ink-700 px-3 py-2 text-left text-gray-300">{chart.measureLabel}</th>
                      {chart.rows.map((r, i) => (
                        <th key={i} className={`whitespace-nowrap border border-white/10 px-3 py-2 ${i === matchIdx ? "bg-lime/20 text-lime" : "bg-ink-700 text-gray-300"}`}>
                          {r.min} - {r.max}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["Tamanho Universal", "universal"],
                      ["Tamanho na Europa", "europa"],
                      ["Tamanho no Brasil", "brasil"],
                    ] as const).map(([label, key]) => (
                      <tr key={key}>
                        <td className="sticky left-0 border border-white/10 bg-ink-900 px-3 py-2 text-left font-semibold text-white">{label}</td>
                        {chart.rows.map((r, i) => (
                          <td key={i} className={`border border-white/10 px-3 py-2 ${i === matchIdx ? "bg-lime/15 font-bold text-lime" : "text-gray-300"}`}>
                            {r[key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-gray-500">Dica: meça a circunferência do peito com a fita bem ajustada e use o campo acima.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

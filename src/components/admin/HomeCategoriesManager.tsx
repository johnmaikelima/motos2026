"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHomeCategories, type HomeCategoriesResult } from "@/server/home-categories-actions";

type CatInfo = { name: string; count: number };

export default function HomeCategoriesManager({
  available,
  selected: initialSelected,
}: {
  available: CatInfo[];
  selected: string[];
}) {
  const router = useRouter();
  // Ordem escolhida (selecionadas, na ordem). Vazio = automático (todas).
  const [order, setOrder] = useState<string[]>(
    initialSelected.filter((c) => available.some((a) => a.name === c)),
  );
  const [pending, start] = useTransition();
  const [result, setResult] = useState<HomeCategoriesResult | null>(null);

  const countOf = (name: string) => available.find((a) => a.name === name)?.count ?? 0;
  const isOn = (name: string) => order.includes(name);
  const auto = order.length === 0;

  function toggle(name: string) {
    setResult(null);
    setOrder((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }
  function move(name: string, dir: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(name);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function save() {
    setResult(null);
    start(async () => {
      const res = await saveHomeCategories(order);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  // Categorias ainda não escolhidas (para adicionar).
  const remaining = available.filter((a) => !order.includes(a.name));

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="heading-display text-xl text-white">Categorias na página inicial</h2>
          <p className="mt-1 text-sm text-gray-400">
            Escolha quais categorias aparecem na home e em que ordem. As selecionadas viram cards e
            prateleiras (categorias com 4+ produtos).
          </p>
        </div>
        <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${auto ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-lime/30 bg-lime/10 text-lime"}`}>
        {auto
          ? "Modo automático: nenhuma categoria selecionada — a home mostra TODAS por quantidade de produtos."
          : `${order.length} categoria(s) selecionada(s) — só essas aparecem, nesta ordem.`}
      </div>

      {/* Selecionadas (ordenáveis) */}
      {order.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Na home (ordem)</p>
          <div className="flex flex-col gap-2">
            {order.map((name, i) => (
              <div key={name} className="flex items-center justify-between gap-3 rounded-md border border-lime/30 bg-lime/5 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{i + 1}.</span>
                  <span className="text-sm font-semibold text-white">{name}</span>
                  <span className="text-xs text-gray-400">{countOf(name)} produto(s)</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(name, -1)} disabled={i === 0} className="rounded px-2 py-1 text-gray-300 hover:bg-white/10 disabled:opacity-30" aria-label="Subir">↑</button>
                  <button onClick={() => move(name, 1)} disabled={i === order.length - 1} className="rounded px-2 py-1 text-gray-300 hover:bg-white/10 disabled:opacity-30" aria-label="Descer">↓</button>
                  <button onClick={() => toggle(name)} className="ml-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-red-400">remover</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disponíveis para adicionar */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
          {order.length > 0 ? "Adicionar categoria" : "Categorias disponíveis"}
        </p>
        {remaining.length === 0 ? (
          <p className="text-xs text-gray-500">Todas as categorias já estão na home.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {remaining.map((a) => (
              <button
                key={a.name}
                onClick={() => toggle(a.name)}
                className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-gray-300 transition hover:border-lime/60 hover:text-white"
              >
                + {a.name} <span className="text-gray-500">({a.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {result && <p className={`mt-4 text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</p>}
    </div>
  );
}

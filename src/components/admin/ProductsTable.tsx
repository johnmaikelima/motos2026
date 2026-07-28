"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  renameProduct,
  toggleActive,
  suggestCategories,
  bulkSetCategory,
  bulkApplyMargin,
  deleteProducts,
  type ActionResult,
} from "@/server/catalog-actions";
import { formatBRL } from "@/lib/format";

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  rawName: string | null;
  brand: string;
  image: string;
  color: string | null;
  categoria: string | null;
  subcategoria: string | null;
  variantes: number;
  estoque: number;
  precoMin: number;
  custo: number;
  precoSugerido: boolean;
  tamanhos: string;
  active: boolean;
  reviewed: boolean;
};

function Row({
  p,
  checked,
  onCheck,
}: {
  p: AdminProduct;
  checked: boolean;
  onCheck: (id: string, v: boolean) => void;
}) {
  const [name, setName] = useState(p.name);
  const [active, setActive] = useState(p.active);
  const [pending, start] = useTransition();
  const dirty = name.trim() !== p.name;

  return (
    <tr className={`border-b border-white/5 hover:bg-white/5 ${checked ? "bg-lime/5" : ""}`}>
      <td className="px-3 py-3">
        <input type="checkbox" checked={checked} onChange={(e) => onCheck(p.id, e.target.checked)} className="h-4 w-4 accent-lime" />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-ink-700">
            <Image src={p.image} alt="" fill className="object-cover" sizes="40px" />
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64 max-w-full rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white outline-none focus:border-lime/60"
          />
        </div>
      </td>
      <td className="px-3 py-3 text-gray-400">{p.brand}</td>
      <td className="px-3 py-3">
        {p.categoria ? (
          <div className="text-xs">
            <span className="text-white">{p.categoria}</span>
            {p.subcategoria && <span className="block text-gray-500">{p.subcategoria}</span>}
          </div>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center text-gray-300">{p.variantes}</td>
      <td className="px-3 py-3 text-center">
        <span className={p.estoque <= 0 ? "text-red-400" : "text-gray-200"}>{p.estoque}</span>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="font-semibold text-lime">{formatBRL(p.precoMin)}</div>
        <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${p.precoSugerido ? "bg-sky-500/15 text-sky-300" : "bg-amber-500/15 text-amber-300"}`}>
          {p.precoSugerido ? "Sugerido" : "Nosso"}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-gray-300">{p.custo > 0 ? formatBRL(p.custo) : "—"}</td>
      <td className="px-3 py-3 text-right">
        {p.custo > 0 ? (
          <div>
            <div className={`font-semibold ${p.precoMin - p.custo >= 0 ? "text-lime" : "text-red-400"}`}>{formatBRL(p.precoMin - p.custo)}</div>
            <div className="text-[10px] text-gray-500">{Math.round(((p.precoMin - p.custo) / p.precoMin) * 100)}% margem</div>
          </div>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <button
          onClick={() => start(async () => { const n = !active; setActive(n); await toggleActive(p.id, n); })}
          disabled={pending}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${active ? "border-lime/30 bg-lime/15 text-lime" : "border-white/15 bg-white/5 text-gray-400"}`}
        >
          {active ? "Ativo" : "Inativo"}
        </button>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/produto/${p.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir a página pública do produto"
            className="rounded-md border border-white/20 px-3 py-1 text-xs font-bold uppercase text-gray-200 transition hover:border-lime/60 hover:text-lime"
          >
            Ver ↗
          </Link>
          <Link href={`/admin/produtos/${p.id}`} className="rounded-md border border-white/20 px-3 py-1 text-xs font-bold uppercase text-gray-200 transition hover:border-lime/60 hover:text-lime">
            Editar
          </Link>
          <button
            onClick={() => start(async () => { await renameProduct(p.id, name); })}
            disabled={pending || !dirty}
            className="rounded-md border border-lime/50 px-3 py-1 text-xs font-bold uppercase text-lime transition hover:bg-lime hover:text-black disabled:opacity-30"
          >
            Salvar nome
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ProductsTable({
  products,
  categories = [],
}: {
  products: AdminProduct[];
  categories?: { categoria: string; subs: string[] }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [tipoPreco, setTipoPreco] = useState<"todos" | "sugerido" | "nosso">("todos");
  const [custoMin, setCustoMin] = useState("");
  const [custoMax, setCustoMax] = useState("");
  const [modoLucro, setModoLucro] = useState<"percent" | "fixed">("percent");
  const [margem, setMargem] = useState("10");
  const [taxa, setTaxa] = useState("10");
  const [confirmMargem, setConfirmMargem] = useState(false);

  const filtered = useMemo(() => {
    let list = products;
    if (q) {
      const t = q.toLowerCase();
      list = list.filter((p) => `${p.name} ${p.brand} ${p.rawName ?? ""} ${p.categoria ?? ""}`.toLowerCase().includes(t));
    }
    if (tipoPreco !== "todos") {
      list = list.filter((p) => (tipoPreco === "sugerido" ? p.precoSugerido : !p.precoSugerido));
    }
    // Filtro por custo (de / até). Quando algum limite é informado, só inclui
    // produtos com custo conhecido (> 0).
    const min = custoMin.trim() === "" ? null : Number(custoMin);
    const max = custoMax.trim() === "" ? null : Number(custoMax);
    if (min !== null || max !== null) {
      list = list.filter((p) => {
        if (!(p.custo > 0)) return false;
        if (min !== null && Number.isFinite(min) && p.custo < min) return false;
        if (max !== null && Number.isFinite(max) && p.custo > max) return false;
        return true;
      });
    }
    return list.slice(0, 300);
  }, [q, products, tipoPreco, custoMin, custoMax]);

  function check(id: string, v: boolean) {
    setSelected((prev) => { const n = new Set(prev); if (v) n.add(id); else n.delete(id); return n; });
  }
  function checkAll(v: boolean) {
    setSelected(v ? new Set(filtered.map((p) => p.id)) : new Set());
  }
  const ids = () => [...selected];

  function runAI() {
    setResult(null);
    start(async () => {
      const res = await suggestCategories(ids());
      setResult(res);
      if (res.ok) { setSelected(new Set()); router.refresh(); }
    });
  }
  function applyManual() {
    setResult(null);
    start(async () => {
      const res = await bulkSetCategory(ids(), cat, sub);
      setResult(res);
      if (res.ok) { setSelected(new Set()); setCat(""); setSub(""); router.refresh(); }
    });
  }
  function runDelete() {
    setResult(null);
    start(async () => {
      const res = await deleteProducts(ids());
      setResult(res);
      setConfirmDel(false);
      if (res.ok) { setSelected(new Set()); router.refresh(); }
    });
  }
  function applyMargin() {
    setResult(null);
    start(async () => {
      const res = await bulkApplyMargin(ids(), { mode: modoLucro, value: Number(margem), fee: Number(taxa) });
      setResult(res);
      setConfirmMargem(false);
      if (res.ok) { setSelected(new Set()); router.refresh(); }
    });
  }

  // Prévia: custo R$ 50 -> preço com a margem/lucro/taxa atuais.
  const v = Number(margem) || 0;
  const base = modoLucro === "fixed" ? 50 + v : 50 * (1 + v / 100);
  const exemplo = base + (Number(taxa) || 0);

  const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  // Autocomplete: categorias existentes + subcategorias da categoria digitada.
  const allCats = categories.map((c) => c.categoria);
  const subsForCat = categories.find((c) => c.categoria.toLowerCase() === cat.trim().toLowerCase())?.subs;
  const subOptions = subsForCat ?? [...new Set(categories.flatMap((c) => c.subs))];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto / marca / categoria..."
            className="w-72 max-w-full rounded-md border border-white/10 bg-ink-800 px-3 py-1.5 text-sm text-white outline-none focus:border-lime/60"
          />
          <select
            value={tipoPreco}
            onChange={(e) => setTipoPreco(e.target.value as "todos" | "sugerido" | "nosso")}
            className="rounded-md border border-white/10 bg-ink-800 px-3 py-1.5 text-sm text-white outline-none focus:border-lime/60"
            title="Filtrar por tipo de preço"
          >
            <option value="todos">Todos os preços</option>
            <option value="sugerido">Preço sugerido (Laquila)</option>
            <option value="nosso">Preço gerado por nós</option>
          </select>
          <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-800/60 px-2 py-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Custo R$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={custoMin}
              onChange={(e) => setCustoMin(e.target.value)}
              placeholder="de"
              title="Custo mínimo"
              className="w-16 rounded border border-white/10 bg-ink-800 px-2 py-1 text-right text-sm text-white outline-none focus:border-lime/60"
            />
            <span className="text-xs text-gray-500">até</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={custoMax}
              onChange={(e) => setCustoMax(e.target.value)}
              placeholder="∞"
              title="Custo máximo"
              className="w-16 rounded border border-white/10 bg-ink-800 px-2 py-1 text-right text-sm text-white outline-none focus:border-lime/60"
            />
            {(custoMin || custoMax) && (
              <button
                onClick={() => { setCustoMin(""); setCustoMax(""); }}
                title="Limpar filtro de custo"
                className="text-xs text-gray-400 hover:text-lime"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-500">{filtered.length} produto(s){q || tipoPreco !== "todos" || custoMin || custoMax ? " (filtrado)" : ""}</span>
      </div>

      {/* Barra de ações em massa */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-lime/20 bg-lime/5 px-3 py-3">
          <span className="text-sm font-semibold text-lime">{selected.size} selecionado(s)</span>
          <button onClick={runAI} disabled={pending} className="btn-primary disabled:opacity-50">
            {pending ? "Processando..." : "✨ Sugerir categorias (IA)"}
          </button>
          <div className="flex items-center gap-2">
            <input list="cats-dl" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Categoria (existente ou nova)" className="w-48 rounded-md border border-white/10 bg-ink-800 px-2 py-1.5 text-sm text-white outline-none focus:border-lime/60" />
            <input list="subs-dl" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Subcategoria" className="w-44 rounded-md border border-white/10 bg-ink-800 px-2 py-1.5 text-sm text-white outline-none focus:border-lime/60" />
            <datalist id="cats-dl">{allCats.map((c) => <option key={c} value={c} />)}</datalist>
            <datalist id="subs-dl">{subOptions.map((s) => <option key={s} value={s} />)}</datalist>
            <button onClick={applyManual} disabled={pending || !cat.trim()} className="btn-outline disabled:opacity-40">Aplicar</button>
          </div>

          {/* Aplicar margem/lucro em massa (só produtos "Nosso") */}
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-ink-800/60 px-2 py-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Lucro</span>
            <select
              value={modoLucro}
              onChange={(e) => setModoLucro(e.target.value as "percent" | "fixed")}
              title="Lucro em % sobre o custo, ou em R$ fixo"
              className="rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white outline-none focus:border-lime/60"
            >
              <option value="percent">% sobre o custo</option>
              <option value="fixed">R$ fixo</option>
            </select>
            <input
              type="number"
              step={modoLucro === "fixed" ? "0.01" : "1"}
              min="0"
              value={margem}
              onChange={(e) => setMargem(e.target.value)}
              title={modoLucro === "fixed" ? "Lucro em reais por item" : "Margem de lucro sobre o custo (%)"}
              className="w-16 rounded border border-white/10 bg-ink-800 px-2 py-1 text-right text-sm text-white outline-none focus:border-lime/60"
            />
            <span className="text-xs text-gray-500">{modoLucro === "fixed" ? "R$" : "%"} + taxa R$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
              title="Taxa fixa por item (ex.: R$ 10 da Laquila)"
              className="w-16 rounded border border-white/10 bg-ink-800 px-2 py-1 text-right text-sm text-white outline-none focus:border-lime/60"
            />
            <span className="text-[11px] text-gray-500">ex.: custo R$ 50 → <span className="font-semibold text-lime">{formatBRL(exemplo)}</span></span>
            {!confirmMargem ? (
              <button onClick={() => setConfirmMargem(true)} className="btn-outline">Aplicar margem</button>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xs text-amber-300">Recalcular preço de {selected.size}?</span>
                <button onClick={applyMargin} disabled={pending} className="rounded-md bg-lime px-3 py-1.5 text-xs font-bold uppercase text-black disabled:opacity-50">
                  {pending ? "..." : "Sim"}
                </button>
                <button onClick={() => setConfirmMargem(false)} className="text-xs text-gray-400 hover:text-white">não</button>
              </span>
            )}
          </div>

          {/* Excluir selecionados */}
          {!confirmDel ? (
            <button
              onClick={() => setConfirmDel(true)}
              className="rounded-md border border-red-500/50 px-3 py-1.5 text-xs font-bold uppercase text-red-300 transition hover:bg-red-500 hover:text-white"
            >
              Excluir
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-xs text-red-300">Excluir {selected.size}?</span>
              <button onClick={runDelete} disabled={pending} className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-bold uppercase text-white disabled:opacity-50">
                {pending ? "..." : "Sim"}
              </button>
              <button onClick={() => setConfirmDel(false)} className="text-xs text-gray-400 hover:text-white">não</button>
            </span>
          )}

          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-white">Limpar seleção</button>
          {result && <span className={`text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</span>}
        </div>
      )}
      {result && selected.size === 0 && (
        <p className={`px-3 py-2 text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-3"><input type="checkbox" checked={allChecked} onChange={(e) => checkAll(e.target.checked)} className="h-4 w-4 accent-lime" /></th>
              <th className="px-3 py-3 font-semibold">Produto</th>
              <th className="px-3 py-3 font-semibold">Marca</th>
              <th className="px-3 py-3 font-semibold">Categoria</th>
              <th className="px-3 py-3 text-center font-semibold">Var.</th>
              <th className="px-3 py-3 text-center font-semibold">Estoque</th>
              <th className="px-3 py-3 text-right font-semibold">A partir de</th>
              <th className="px-3 py-3 text-right font-semibold">Custo</th>
              <th className="px-3 py-3 text-right font-semibold">Lucro</th>
              <th className="px-3 py-3 text-center font-semibold">Status</th>
              <th className="px-3 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <Row key={p.id} p={p} checked={selected.has(p.id)} onCheck={check} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

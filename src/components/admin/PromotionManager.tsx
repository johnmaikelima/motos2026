"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  createPromotion,
  togglePromotion,
  deletePromotion,
  type PromoResult,
} from "@/server/promotion-actions";
import { formatBRL } from "@/lib/format";

type ProductLite = { id: string; name: string; image: string };
export type PromoRow = {
  id: string;
  name: string;
  minProfit: number;
  giftProductId: string | null;
  active: boolean;
  giftName?: string;
  giftImage?: string;
  qualifies: number;
};

function ProductPicker({
  products,
  value,
  onChange,
}: {
  products: ProductLite[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const chosen = products.find((p) => p.id === value);
  const list = q ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];

  return (
    <div className="relative">
      {chosen ? (
        <div className="flex items-center gap-2 rounded-md border border-lime/40 bg-ink-800 px-2 py-1.5">
          <div className="relative h-8 w-8 overflow-hidden rounded bg-ink-700">
            <Image src={chosen.image} alt="" fill className="object-cover" sizes="32px" />
          </div>
          <span className="flex-1 truncate text-sm text-white">{chosen.name}</span>
          <button onClick={() => onChange("")} className="text-xs text-gray-400 hover:text-red-400">trocar</button>
        </div>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto para o brinde..."
            className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-lime/60"
          />
          {list.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-white/10 bg-ink-900 shadow-xl">
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onChange(p.id); setQ(""); }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5"
                >
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded bg-ink-700">
                    <Image src={p.image} alt="" fill className="object-cover" sizes="28px" />
                  </div>
                  <span className="truncate text-sm text-gray-200">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PromotionManager({
  products,
  promotions,
}: {
  products: ProductLite[];
  promotions: PromoRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [minProfit, setMinProfit] = useState("200");
  const [giftId, setGiftId] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<PromoResult | null>(null);

  function create() {
    setResult(null);
    start(async () => {
      const res = await createPromotion({ name, minProfit: Number(minProfit.replace(",", ".")) || 0, giftProductId: giftId });
      setResult(res);
      if (res.ok) { setName(""); setGiftId(""); setMinProfit("200"); router.refresh(); }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Criar regra */}
      <div className="card p-6">
        <h2 className="heading-display text-xl text-white">Nova regra de brinde</h2>
        <p className="mt-1 text-sm text-gray-400">
          Produtos com <strong>lucro maior ou igual</strong> ao valor abaixo ganham o produto-brinde escolhido.
          O card aparece na página desses produtos.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_1.5fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Nome da regra</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Brinde para alto lucro" className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-lime/60" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Lucro mínimo (R$)</span>
            <input value={minProfit} onChange={(e) => setMinProfit(e.target.value)} inputMode="decimal" className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-lime/60" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Produto-brinde</span>
            <ProductPicker products={products} value={giftId} onChange={setGiftId} />
          </label>
          <button onClick={create} disabled={pending || !giftId} className="btn-primary disabled:opacity-50">
            {pending ? "Criando..." : "Criar regra"}
          </button>
        </div>
        {result && <p className={`mt-3 text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</p>}
      </div>

      {/* Lista de regras */}
      <div className="card p-6">
        <h2 className="heading-display text-xl text-white">Regras ativas ({promotions.length})</h2>
        {promotions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">Nenhuma regra ainda.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {promotions.map((p) => (
              <PromoItem key={p.id} p={p} onChanged={() => router.refresh()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PromoItem({ p, onChanged }: { p: PromoRow; onChanged: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border border-white/10 bg-ink-800/50 p-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{p.name}</p>
        <p className="text-xs text-gray-400">
          Lucro ≥ <strong className="text-lime">{formatBRL(p.minProfit)}</strong> · {p.qualifies} produto(s) qualificam
        </p>
      </div>
      <div className="flex items-center gap-2">
        {p.giftImage && (
          <div className="relative h-9 w-9 overflow-hidden rounded bg-ink-700">
            <Image src={p.giftImage} alt="" fill className="object-cover" sizes="36px" />
          </div>
        )}
        <span className="max-w-[12rem] truncate text-xs text-gray-300">🎁 {p.giftName ?? "—"}</span>
      </div>
      <button
        onClick={() => start(async () => { await togglePromotion(p.id, !p.active); onChanged(); })}
        disabled={pending}
        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${p.active ? "border-lime/30 bg-lime/15 text-lime" : "border-white/15 bg-white/5 text-gray-400"}`}
      >
        {p.active ? "Ativa" : "Inativa"}
      </button>
      <button
        onClick={() => start(async () => { await deletePromotion(p.id); onChanged(); })}
        disabled={pending}
        className="text-xs text-gray-400 hover:text-red-400"
      >
        excluir
      </button>
    </div>
  );
}

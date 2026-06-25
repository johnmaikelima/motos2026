"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createProductManual, type ActionResult } from "@/server/catalog-actions";
import { uploadProductImage } from "@/server/upload-actions";

const inputCls =
  "w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-lime/60";

const empty = {
  name: "",
  brand: "",
  categoria: "",
  subcategoria: "",
  price: "",
  cost: "",
  stock: "0",
  sizes: "",
  description: "",
  image: "",
  weight: "",
  length: "",
  width: "",
  height: "",
};

export default function ManualProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...empty });
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await uploadProductImage(fd);
    setUploading(false);
    e.target.value = "";
    if (r.ok && r.url) set("image", r.url);
  }

  function save() {
    setResult(null);
    start(async () => {
      const res = await createProductManual({
        name: f.name,
        brand: f.brand,
        categoria: f.categoria,
        subcategoria: f.subcategoria,
        price: Number(f.price.replace(",", ".")) || 0,
        cost: Number(f.cost.replace(",", ".")) || 0,
        stock: Number(f.stock) || 0,
        sizes: f.sizes,
        description: f.description,
        image: f.image,
        weight: Number(f.weight.replace(",", ".")) || 0,
        length: Number(f.length.replace(",", ".")) || 0,
        width: Number(f.width.replace(",", ".")) || 0,
        height: Number(f.height.replace(",", ".")) || 0,
      });
      setResult(res);
      if (res.ok) {
        setF({ ...empty });
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Adicionar produto manualmente
      </button>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="heading-display text-xl text-white">Novo produto manual</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-white">fechar</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Nome *</span>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Marca</span>
          <input value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="RunMotos" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Tamanhos (vírgula)</span>
          <input value={f.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="P, M, G, GG" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Categoria</span>
          <input value={f.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Ex.: Jaquetas" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Subcategoria</span>
          <input value={f.subcategoria} onChange={(e) => set("subcategoria", e.target.value)} placeholder="Ex.: Jaquetas Masculinas" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Preço (R$) *</span>
          <input value={f.price} onChange={(e) => set("price", e.target.value)} inputMode="decimal" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Custo (R$)</span>
          <input value={f.cost} onChange={(e) => set("cost", e.target.value)} inputMode="decimal" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Estoque</span>
          <input value={f.stock} onChange={(e) => set("stock", e.target.value)} inputMode="numeric" className={inputCls} />
        </label>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Frete — peso e dimensões da caixa</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input value={f.weight} onChange={(e) => set("weight", e.target.value)} placeholder="Peso (kg)" inputMode="decimal" className={inputCls} />
            <input value={f.length} onChange={(e) => set("length", e.target.value)} placeholder="Compr. (cm)" inputMode="decimal" className={inputCls} />
            <input value={f.width} onChange={(e) => set("width", e.target.value)} placeholder="Largura (cm)" inputMode="decimal" className={inputCls} />
            <input value={f.height} onChange={(e) => set("height", e.target.value)} placeholder="Altura (cm)" inputMode="decimal" className={inputCls} />
          </div>
        </div>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Descrição</span>
          <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} className={inputCls} />
        </label>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Imagem</span>
          <div className="flex items-center gap-3">
            {f.image && (
              <div className="relative h-16 w-16 overflow-hidden rounded bg-ink-700">
                <Image src={f.image} alt="" fill className="object-cover" sizes="64px" />
              </div>
            )}
            <label className="cursor-pointer rounded-md border border-dashed border-lime/40 bg-lime/5 px-3 py-2 text-sm font-semibold text-lime hover:bg-lime/10">
              {uploading ? "Enviando..." : f.image ? "Trocar imagem" : "⬆ Enviar imagem"}
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar produto"}
        </button>
        {result && <span className={`text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</span>}
      </div>
    </div>
  );
}

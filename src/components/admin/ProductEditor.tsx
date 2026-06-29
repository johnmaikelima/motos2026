"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  updateProduct,
  updateVariants,
  updateProductShipping,
  type ActionResult,
} from "@/server/catalog-actions";
import { uploadProductImage } from "@/server/upload-actions";

type Cat = { slug: string; name: string };
type VariantRow = { id: string; cdItem: string; size: string; ean: string; cost: number; price: number; stock: number };
export type ShippingDims = { weight: number; length: number; width: number; height: number };

export type EditorProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoria: string;
  subcategoria: string;
  description: string;
  descricaoComplementar: string;
  caracteristicas: string;
  image: string;
  gallery: string[];
  active: boolean;
  bestSeller: boolean;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-lime/60";

export default function ProductEditor({
  product,
  categories,
  variants: initialVariants,
  shipping: initialShipping,
}: {
  product: EditorProduct;
  categories: Cat[];
  variants: VariantRow[];
  shipping: ShippingDims;
}) {
  const PLACEHOLDER = "/placeholder.svg";
  const isReal = (u: string) => !!u && u !== PLACEHOLDER;

  const [p, setP] = useState(product);
  const initialGallery = (product.gallery.length ? product.gallery : [product.image]).filter(isReal);
  const [gallery, setGallery] = useState<string[]>(initialGallery);
  const [mainImage, setMainImage] = useState(isReal(product.image) ? product.image : initialGallery[0] ?? "");
  const [newUrl, setNewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>(initialVariants);
  const [frete, setFrete] = useState<ShippingDims>(initialShipping);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function setFreteField(k: keyof ShippingDims, v: string) {
    setFrete((prev) => ({ ...prev, [k]: Number(v.replace(",", ".")) || 0 }));
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadProductImage(fd);
    setUploading(false);
    e.target.value = "";
    if (res.ok && res.url) {
      setGallery((g) => [...g, res.url!]);
      setMainImage((m) => (isReal(m) ? m : res.url!)); // placeholder não conta como imagem
    } else {
      setUploadMsg(res.message ?? "Falha no upload.");
    }
  }

  function set<K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }
  function setVar(id: string, data: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
  }
  function addImage() {
    const url = newUrl.trim();
    if (/^https?:\/\//.test(url) || url.startsWith("/")) {
      setGallery((g) => [...g, url]);
      if (!isReal(mainImage)) setMainImage(url);
      setNewUrl("");
    }
  }
  function removeImage(url: string) {
    setGallery((g) => g.filter((u) => u !== url));
    if (mainImage === url) setMainImage(gallery.find((u) => u !== url) ?? "");
  }

  function save() {
    setResult(null);
    start(async () => {
      const r1 = await updateProduct(p.id, {
        name: p.name,
        brand: p.brand,
        categorySlug: p.categorySlug,
        categoria: p.categoria,
        subcategoria: p.subcategoria,
        description: p.description,
        descricaoComplementar: p.descricaoComplementar,
        caracteristicas: p.caracteristicas,
        image: mainImage,
        gallery,
        active: p.active,
        bestSeller: p.bestSeller,
      });
      const r2 = await updateVariants(
        p.id,
        variants.map((v) => ({ id: v.id, size: v.size, ean: v.ean, cost: v.cost, price: v.price, stock: v.stock }))
      );
      const r3 = await updateProductShipping(p.id, frete);
      const all = [r1, r2, r3];
      const fail = all.find((r) => !r.ok);
      setResult(fail ? { ok: false, message: fail.message } : { ok: true, message: "Tudo salvo." });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/produtos" className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-lime">
          ← Voltar
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/produto/${p.slug}`} target="_blank" className="btn-outline">Ver na loja</Link>
          <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-50">
            {pending ? "Salvando..." : "Salvar tudo"}
          </button>
        </div>
      </div>

      {result && (
        <p className={`rounded-md border px-4 py-2 text-sm ${result.ok ? "border-lime/30 bg-lime/10 text-lime" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
          {result.message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Dados principais */}
        <div className="card flex flex-col gap-4 p-6">
          <Field label="Nome do produto">
            <input value={p.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marca">
              <input value={p.brand} onChange={(e) => set("brand", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Categoria">
              <select value={p.categorySlug} onChange={(e) => set("categorySlug", e.target.value)} className={inputCls}>
                <option value={p.categorySlug}>{p.categorySlug}</option>
                {categories.filter((c) => c.slug !== p.categorySlug).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria (tipo)">
              <input value={p.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Ex.: Jaquetas" className={inputCls} />
            </Field>
            <Field label="Subcategoria">
              <input value={p.subcategoria} onChange={(e) => set("subcategoria", e.target.value)} placeholder="Ex.: Jaquetas Masculinas" className={inputCls} />
            </Field>
          </div>
          <Field label="Descrição (exibida na loja)">
            <textarea value={p.description} onChange={(e) => set("description", e.target.value)} rows={4} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Descrição complementar">
              <textarea value={p.descricaoComplementar} onChange={(e) => set("descricaoComplementar", e.target.value)} rows={3} className={inputCls} />
            </Field>
            <Field label="Características">
              <textarea value={p.caracteristicas} onChange={(e) => set("caracteristicas", e.target.value)} rows={3} className={inputCls} />
            </Field>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input type="checkbox" checked={p.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-lime" />
              Ativo na loja
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input type="checkbox" checked={p.bestSeller} onChange={(e) => set("bestSeller", e.target.checked)} className="h-4 w-4 accent-lime" />
              Mais vendido (destaque)
            </label>
          </div>
        </div>

        {/* Imagens */}
        <div className="card flex flex-col gap-3 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Imagens ({gallery.length})</h3>
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((url) => (
              <div key={url} className={`relative aspect-square overflow-hidden rounded border ${mainImage === url ? "border-lime" : "border-white/10"}`}>
                <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-1 py-0.5 text-[9px]">
                  <button onClick={() => setMainImage(url)} className={mainImage === url ? "text-lime" : "text-white"}>
                    {mainImage === url ? "principal" : "tornar principal"}
                  </button>
                  <button onClick={() => removeImage(url)} className="text-red-300">x</button>
                </div>
              </div>
            ))}
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-lime/40 bg-lime/5 px-3 py-2.5 text-sm font-semibold text-lime transition hover:bg-lime/10">
            {uploading ? "Enviando..." : "⬆ Enviar imagem do computador"}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
          </label>
          {uploadMsg && <p className="text-xs text-amber-300">{uploadMsg}</p>}

          <div className="flex gap-2">
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="ou cole uma URL" className={inputCls} />
            <button onClick={addImage} className="btn-outline shrink-0">+</button>
          </div>
        </div>
      </div>

      {/* Frete (peso e dimensões) */}
      <div className="card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Frete — peso e dimensões da caixa</h3>
        <p className="mt-1 text-xs text-gray-500">Usado no cálculo do frete (Envia). Aplica-se a todas as variações deste produto.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Peso (kg)">
            <input value={frete.weight || ""} onChange={(e) => setFreteField("weight", e.target.value)} inputMode="decimal" placeholder="0.5" className={inputCls} />
          </Field>
          <Field label="Comprimento (cm)">
            <input value={frete.length || ""} onChange={(e) => setFreteField("length", e.target.value)} inputMode="decimal" placeholder="20" className={inputCls} />
          </Field>
          <Field label="Largura (cm)">
            <input value={frete.width || ""} onChange={(e) => setFreteField("width", e.target.value)} inputMode="decimal" placeholder="15" className={inputCls} />
          </Field>
          <Field label="Altura (cm)">
            <input value={frete.height || ""} onChange={(e) => setFreteField("height", e.target.value)} inputMode="decimal" placeholder="10" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Variações */}
      <div className="card overflow-hidden">
        <h3 className="px-6 pt-6 text-sm font-bold uppercase tracking-wide text-gray-400">Variações ({variants.length})</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-white/10 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-semibold">SKU</th>
                <th className="px-3 py-2 font-semibold">Tamanho</th>
                <th className="px-3 py-2 font-semibold">EAN</th>
                <th className="px-3 py-2 text-right font-semibold">Custo</th>
                <th className="px-3 py-2 text-right font-semibold">Preço</th>
                <th className="px-3 py-2 text-right font-semibold">Estoque</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-b border-white/5">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{v.cdItem}</td>
                  <td className="px-3 py-2"><input value={v.size} onChange={(e) => setVar(v.id, { size: e.target.value })} className="w-16 rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white" /></td>
                  <td className="px-3 py-2"><input value={v.ean} onChange={(e) => setVar(v.id, { ean: e.target.value })} className="w-40 rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white" /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={v.cost} onChange={(e) => setVar(v.id, { cost: Number(e.target.value) })} className="w-24 rounded border border-white/10 bg-ink-800 px-2 py-1 text-right text-sm text-white" /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={v.price} onChange={(e) => setVar(v.id, { price: Number(e.target.value) })} className="w-24 rounded border border-white/10 bg-ink-800 px-2 py-1 text-right text-sm text-lime" /></td>
                  <td className="px-3 py-2"><input type="number" value={v.stock} onChange={(e) => setVar(v.id, { stock: Number(e.target.value) })} className="w-20 rounded border border-white/10 bg-ink-800 px-2 py-1 text-right text-sm text-white" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-6 py-3 text-[11px] text-gray-500">
          Obs.: estoque e custo são atualizados na reimportação/sincronização. Edições manuais de preço podem ser sobrescritas ao reimportar.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { saveStoreSettings, type SettingsResult } from "@/server/settings-actions";
import { uploadProductImage } from "@/server/upload-actions";
import type { StoreSettings } from "@/lib/store-settings";

const inputCls =
  "w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-lime/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  );
}

export default function StoreSettingsForm({ initial }: { initial: StoreSettings }) {
  const [s, setS] = useState<StoreSettings>(initial);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SettingsResult | null>(null);

  function set<K extends keyof StoreSettings>(k: K, v: string) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await uploadProductImage(fd);
    setUploading(false);
    e.target.value = "";
    if (r.ok && r.url) set("logoUrl", r.url);
  }

  function save() {
    setResult(null);
    start(async () => setResult(await saveStoreSettings(s)));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Identidade */}
      <div className="card p-6">
        <h2 className="heading-display text-xl text-white">Identidade</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nome da loja">
            <input value={s.storeName} onChange={(e) => set("storeName", e.target.value)} className={inputCls} />
          </Field>
          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Logo</span>
            <div className="flex items-center gap-3">
              {s.logoUrl ? (
                <div className="relative h-12 w-32 overflow-hidden rounded bg-ink-700">
                  <Image src={s.logoUrl} alt="logo" fill className="object-contain" sizes="128px" />
                </div>
              ) : (
                <span className="text-xs text-gray-500">Sem logo (mostra o nome)</span>
              )}
              <label className="cursor-pointer rounded-md border border-dashed border-lime/40 bg-lime/5 px-3 py-2 text-sm font-semibold text-lime hover:bg-lime/10">
                {uploading ? "Enviando..." : "⬆ Enviar"}
                <input type="file" accept="image/*" className="hidden" onChange={onLogo} disabled={uploading} />
              </label>
              {s.logoUrl && (
                <button onClick={() => set("logoUrl", "")} className="text-xs text-gray-400 hover:text-red-400">
                  remover
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="card p-6">
        <h2 className="heading-display text-xl text-white">Contato</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="E-mail">
            <input value={s.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Telefone">
            <input value={s.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={inputCls} />
          </Field>
          <Field label="WhatsApp">
            <input value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" className={inputCls} />
          </Field>
          <Field label="Endereço">
            <input value={s.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
          </Field>
          <Field label="CEP de origem (para o frete)">
            <input value={s.originCep} onChange={(e) => set("originCep", e.target.value)} placeholder="01001000" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Redes sociais */}
      <div className="card p-6">
        <h2 className="heading-display text-xl text-white">Redes sociais</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Instagram (URL)">
            <input value={s.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/..." className={inputCls} />
          </Field>
          <Field label="Facebook (URL)">
            <input value={s.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/..." className={inputCls} />
          </Field>
          <Field label="YouTube (URL)">
            <input value={s.youtube} onChange={(e) => set("youtube", e.target.value)} placeholder="https://youtube.com/..." className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Pagamento */}
      <div className="card p-6">
        <h2 className="heading-display text-xl text-white">Pagamento</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Desconto à vista no PIX (%)">
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={s.pixDiscountPct}
              onChange={(e) => setS((prev) => ({ ...prev, pixDiscountPct: Number(e.target.value) }))}
              className={inputCls}
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Aplicado sobre o valor dos <strong>produtos</strong> (não no frete) quando o cliente paga via PIX. Ex.: 5 = 5% de desconto. Use 0 para desativar.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar configurações"}
        </button>
        {result && <span className={`text-sm ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</span>}
      </div>
    </div>
  );
}

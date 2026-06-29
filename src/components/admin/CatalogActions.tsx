"use client";

import { useState, useTransition } from "react";
import { syncStock, localizeCatalogImages, repairBrokenImages, type ActionResult } from "@/server/catalog-actions";

export default function CatalogActions() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgStatus, setImgStatus] = useState<string | null>(null);
  const [repBusy, setRepBusy] = useState(false);
  const [repStatus, setRepStatus] = useState<string | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => setResult(await syncStock()));
  }

  async function baixarImagens() {
    setImgBusy(true);
    setImgStatus("Baixando imagens para o servidor...");
    try {
      let total = 0;
      // Roda em lotes até não restar nada (ou um lote não localizar nada novo).
      for (let i = 0; i < 200; i++) {
        const r = await localizeCatalogImages(25);
        if (!r.ok) {
          setImgStatus(r.message);
          break;
        }
        total += r.localized;
        if (r.remaining <= 0) {
          setImgStatus(`Concluído! ${total} imagem(ns) baixada(s). Todas no seu servidor.`);
          break;
        }
        setImgStatus(`Baixando... ${total} prontas · ${r.remaining} restante(s).`);
        // Se um lote inteiro não localizou nada novo, são imagens inacessíveis: pare.
        if (r.localized === 0) {
          setImgStatus(`${total} baixada(s). ${r.remaining} não puderam ser baixadas (link indisponível) e seguem remotas.`);
          break;
        }
      }
    } catch {
      setImgStatus("Erro ao baixar imagens.");
    } finally {
      setImgBusy(false);
    }
  }

  async function repararImagens() {
    setRepBusy(true);
    setRepStatus("Procurando imagens quebradas...");
    try {
      let totalRep = 0;
      let totalClr = 0;
      for (let i = 0; i < 200; i++) {
        const r = await repairBrokenImages(12);
        if (!r.ok) {
          setRepStatus(r.message);
          break;
        }
        totalRep += r.repaired;
        totalClr += r.cleared;
        if (r.remaining <= 0) {
          setRepStatus(`Concluído! ${totalRep} reparada(s), ${totalClr} sem foto (viraram placeholder).`);
          break;
        }
        if (r.processed === 0) {
          setRepStatus("Nenhuma imagem quebrada encontrada.");
          break;
        }
        setRepStatus(`Reparando... ${totalRep} ok, ${totalClr} s/ foto · ${r.remaining} restante(s).`);
      }
    } catch {
      setRepStatus("Erro ao reparar imagens.");
    } finally {
      setRepBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={repararImagens} disabled={repBusy} className="btn-outline disabled:opacity-50">
          {repBusy ? "Reparando..." : "Reparar imagens quebradas"}
        </button>
        <button onClick={baixarImagens} disabled={imgBusy} className="btn-outline disabled:opacity-50">
          {imgBusy ? "Baixando imagens..." : "Baixar imagens p/ o servidor"}
        </button>
        <button onClick={run} disabled={pending} className="btn-outline disabled:opacity-50">
          {pending ? "Sincronizando..." : "Sincronizar estoque (API)"}
        </button>
      </div>
      {repStatus && <span className="text-xs text-gray-300">{repStatus}</span>}
      {imgStatus && <span className="text-xs text-gray-300">{imgStatus}</span>}
      {result && (
        <span className={`text-xs ${result.ok ? "text-lime" : "text-amber-300"}`}>{result.message}</span>
      )}
    </div>
  );
}

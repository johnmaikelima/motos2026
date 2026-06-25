"use client";

import { useEffect, useState } from "react";

/** Mostra a URL do feed do Google Shopping com botão de copiar. */
export default function FeedLinkCard() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/api/merchant-feed`);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card p-6">
      <h2 className="heading-display text-xl text-white">Feed do Google Merchant Center</h2>
      <p className="mt-1 text-sm text-gray-400">
        Cadastre esta URL no Merchant Center (Produtos → Feeds → buscar do site). Uma oferta por
        tamanho, com GTIN, imagens e categorias.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none"
        />
        <button onClick={copy} className="btn-primary">
          {copied ? "Copiado!" : "Copiar"}
        </button>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-outline">
            Abrir
          </a>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Dica: o feed usa o domínio atual. Garanta que o <code>NEXT_PUBLIC_SITE_URL</code> esteja no
        domínio real (as imagens precisam de URL absoluta).
      </p>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { sendModelSampleAction, type TestEmailResult } from "@/server/email-actions";
import type { EmailKind } from "@/lib/email";

type Model = { kind: EmailKind; label: string; audience: string; subject: string; html: string };

function iframeDoc(html: string): string {
  // Simula um cliente de e-mail: fundo claro em volta do card escuro do template.
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#e9edf2;padding:16px">${html}</body></html>`;
}

export default function EmailModels({ models, defaultTo }: { models: Model[]; defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [sendingKind, setSendingKind] = useState<EmailKind | null>(null);
  const [result, setResult] = useState<TestEmailResult | null>(null);
  const [, start] = useTransition();

  function send(kind: EmailKind) {
    setResult(null);
    setSendingKind(kind);
    start(async () => {
      const r = await sendModelSampleAction(kind, to);
      setResult(r);
      setSendingKind(null);
    });
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="heading-display text-xl text-white">Modelos de e-mail</h2>
          <p className="mt-1 text-sm text-gray-400">
            Veja como cada notificação chega ao cliente e envie um exemplo para testar.
          </p>
        </div>
        <label className="flex items-end gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Enviar exemplos para</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-56 rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-lime/60"
          />
        </label>
      </div>

      {result && (
        <p
          className={`mt-4 rounded-md border px-3 py-2.5 text-sm ${
            result.ok ? "border-lime/40 bg-lime/10 text-lime" : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {result.ok ? "✓ " : "✕ "}
          {result.message}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {models.map((m) => (
          <div key={m.kind} className="overflow-hidden rounded-lg border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-ink-800/60 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">{m.label}</p>
                <p className="text-xs text-gray-500">
                  {m.audience} · <span className="text-gray-400">{m.subject}</span>
                </p>
              </div>
              <button
                onClick={() => send(m.kind)}
                disabled={sendingKind !== null}
                className="shrink-0 rounded-md border border-lime/50 px-3 py-1.5 text-xs font-bold uppercase text-lime transition hover:bg-lime hover:text-black disabled:opacity-40"
              >
                {sendingKind === m.kind ? "Enviando…" : "Enviar este"}
              </button>
            </div>
            <iframe
              title={m.label}
              srcDoc={iframeDoc(m.html)}
              className="h-80 w-full border-0 bg-white"
              sandbox=""
            />
          </div>
        ))}
      </div>
    </div>
  );
}

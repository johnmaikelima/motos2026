"use client";

import { useState, useTransition } from "react";
import { sendTestEmailAction, type TestEmailResult } from "@/server/email-actions";

export default function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [result, setResult] = useState<TestEmailResult | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setResult(null);
    start(async () => setResult(await sendTestEmailAction(to)));
  }

  return (
    <div className="card p-6">
      <h2 className="heading-display text-xl text-white">Enviar e-mail de teste</h2>
      <p className="mt-1 text-sm text-gray-400">
        Dispara uma mensagem real usando a configuração atual. Use para confirmar que o SMTP está funcionando.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Enviar para</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none focus:border-lime/60"
          />
        </label>
        <button
          onClick={send}
          disabled={pending}
          className="btn-primary shrink-0 disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar teste"}
        </button>
      </div>

      {result && (
        <p
          className={`mt-4 rounded-md border px-3 py-2.5 text-sm ${
            result.ok
              ? "border-lime/40 bg-lime/10 text-lime"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {result.ok ? "✓ " : "✕ "}
          {result.message}
        </p>
      )}
    </div>
  );
}

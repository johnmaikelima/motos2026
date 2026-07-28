"use client";

import { useState, useTransition } from "react";
import { requestLoginCode, verifyLoginCode, type MyData } from "@/server/auth-actions";

export default function CheckoutLogin({ onLogin }: { onLogin: (data: MyData) => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function send() {
    setMsg("");
    start(async () => {
      const r = await requestLoginCode(email);
      setMsg(r.message);
      if (r.ok) setStage("code");
    });
  }
  function verify() {
    setMsg("");
    start(async () => {
      const r = await verifyLoginCode(email, code);
      if (r.ok) onLogin(r.data);
      else setMsg(r.message);
    });
  }

  if (!open) {
    return (
      <div className="card flex items-center justify-between gap-3 p-4">
        <p className="text-sm text-gray-300">Já é cliente? Entre para carregar seus dados.</p>
        <button onClick={() => setOpen(true)} className="btn-outline shrink-0">Entrar</button>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-300">Entrar por código no e-mail</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white">fechar</button>
      </div>

      {stage === "email" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none focus:border-lime/60"
          />
          <button onClick={send} disabled={pending} className="btn-primary shrink-0 disabled:opacity-50">
            {pending ? "Enviando..." : "Enviar código"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">Enviamos um código para <strong>{email}</strong>. Digite abaixo:</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Código de 6 dígitos"
              className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-center text-lg tracking-[0.3em] text-white outline-none focus:border-lime/60"
            />
            <button onClick={verify} disabled={pending || code.length < 6} className="btn-primary shrink-0 disabled:opacity-50">
              {pending ? "Entrando..." : "Entrar"}
            </button>
          </div>
          <button onClick={() => setStage("email")} className="text-left text-xs text-gray-500 hover:text-white">
            ← usar outro e-mail
          </button>
        </div>
      )}

      {msg && <p className="text-xs text-amber-300">{msg}</p>}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { login } from "@/server/admin-auth";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <div className="container-rm flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-sm p-8">
        <h1 className="heading-display text-2xl text-white">Painel RunMotos</h1>
        <p className="mt-1 text-sm text-gray-400">Acesso restrito à administração.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">
              Senha de administrador
            </label>
            <input
              name="password"
              type="password"
              required
              autoFocus
              className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none focus:border-lime/60"
            />
          </div>

          {state?.error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-50">
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

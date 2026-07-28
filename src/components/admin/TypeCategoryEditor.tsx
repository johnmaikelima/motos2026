"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameCategory, type ActionResult } from "@/server/catalog-actions";

export type CatNode = { categoria: string; total: number; subs: { name: string; count: number }[] };

function RenameInput({
  field,
  value,
  count,
  bold,
}: {
  field: "categoria" | "subcategoria";
  value: string;
  count: number;
  bold?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(value);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const dirty = name.trim() !== value && name.trim() !== "";

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={`w-56 rounded border border-white/10 bg-ink-800 px-2 py-1 text-sm text-white outline-none focus:border-lime/60 ${bold ? "font-semibold" : ""}`}
      />
      <span className="text-xs text-gray-500">{count}</span>
      <button
        onClick={() =>
          start(async () => {
            const res = await renameCategory(field, value, name.trim());
            setMsg(res);
            if (res.ok) router.refresh();
          })
        }
        disabled={pending || !dirty}
        className="rounded border border-lime/50 px-2 py-1 text-[11px] font-bold uppercase text-lime transition hover:bg-lime hover:text-black disabled:opacity-30"
      >
        Salvar
      </button>
      {msg && <span className={`text-[11px] ${msg.ok ? "text-lime" : "text-amber-300"}`}>{msg.message}</span>}
    </div>
  );
}

export default function TypeCategoryEditor({ tree, semCategoria }: { tree: CatNode[]; semCategoria: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="heading-display text-lg text-white">Categorias (tipo)</span>
          <span className="ml-3 text-xs text-gray-400">
            {tree.length} categoria(s){semCategoria > 0 ? ` · ${semCategoria} sem categoria` : ""}
          </span>
        </span>
        <span className="text-gray-400">{open ? "▲ fechar" : "▼ abrir"}</span>
      </button>

      {open && (
        <div className="mt-4">
          <p className="mb-3 text-sm text-gray-400">
            Atribuídas pela IA ou manualmente. Edite o nome aqui (renomeia em todos os produtos que a usam).
          </p>
          {tree.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-ink-800 p-4 text-sm text-gray-400">
              Nenhuma categoria ainda. Selecione produtos na tabela abaixo e clique em{" "}
              <strong>✨ Sugerir categorias (IA)</strong>.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {tree.map((node) => (
                <div key={node.categoria} className="rounded-md border border-white/10 bg-ink-800/50 p-3">
                  <RenameInput field="categoria" value={node.categoria} count={node.total} bold />
                  <div className="mt-2 flex flex-col gap-2 border-l border-white/10 pl-4">
                    {node.subs.filter((s) => s.name !== "—").map((s) => (
                      <RenameInput key={s.name} field="subcategoria" value={s.name} count={s.count} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

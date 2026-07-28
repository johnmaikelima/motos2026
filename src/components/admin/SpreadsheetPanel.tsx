"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeSpreadsheet,
  importSpreadsheet,
  type ActionResult,
} from "@/server/catalog-actions";

export default function SpreadsheetPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"analyze" | "import" | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  function run(which: "analyze" | "import") {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setResult({ ok: false, message: "Selecione o arquivo .xlsx da Laquila primeiro." });
      return;
    }
    setBusy(which);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const action = which === "analyze" ? analyzeSpreadsheet : importSpreadsheet;
      const res = await action(null, fd);
      setResult(res);
      setBusy(null);
      // Recarrega os dados do servidor (faz as marcas recém-descobertas aparecerem).
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="card p-6">
      <h2 className="heading-display text-xl text-white">Planilha de produtos (Laquila)</h2>
      <p className="mt-1 max-w-2xl text-sm text-gray-400">
        Os produtos são cadastrados pela planilha. <strong>1)</strong> Selecione o arquivo e clique em{" "}
        <strong>Analisar</strong> para listar as marcas. <strong>2)</strong> Marque abaixo quais marcas
        importar. <strong>3)</strong> Clique em <strong>Importar</strong> (traz só marcas marcadas e com saldo).
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md border border-white/15 bg-ink-800 px-4 py-2.5 text-sm text-gray-200 transition hover:border-lime/60">
          {fileName || "Escolher arquivo .xlsx"}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>

        <button onClick={() => run("analyze")} disabled={pending} className="btn-outline disabled:opacity-50">
          {busy === "analyze" ? "Analisando..." : "1. Analisar"}
        </button>
        <button onClick={() => run("import")} disabled={pending} className="btn-primary disabled:opacity-50">
          {busy === "import" ? "Importando..." : "3. Importar"}
        </button>
      </div>

      {result && (
        <p
          className={`mt-4 rounded-md border px-4 py-2.5 text-xs ${
            result.ok ? "border-lime/30 bg-lime/10 text-lime" : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}

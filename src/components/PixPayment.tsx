"use client";

import { useEffect, useRef, useState } from "react";
import { createPixForOrder, checkPixStatus } from "@/server/mercadopago-actions";

export default function PixPayment({
  localOrderId,
  onPaid,
}: {
  localOrderId: string;
  onPaid: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [qr, setQr] = useState("");
  const [copia, setCopia] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const created = useRef(false);

  useEffect(() => {
    if (created.current) return; // evita duplicar em StrictMode
    created.current = true;
    let cancelled = false;
    createPixForOrder(localOrderId).then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setStatus("error");
        setMsg(r.error);
        return;
      }
      setQr(r.qrCodeBase64 ?? "");
      setCopia(r.copiaECola ?? "");
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [localOrderId]);

  // Verifica o pagamento a cada 4s.
  useEffect(() => {
    if (status !== "ready") return;
    const iv = setInterval(async () => {
      const r = await checkPixStatus(localOrderId);
      if (r.ok && r.paid) {
        clearInterval(iv);
        onPaid();
      }
    }, 4000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, localOrderId]);

  function copy() {
    navigator.clipboard?.writeText(copia);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "loading") return <p className="text-sm text-gray-400">Gerando o PIX...</p>;
  if (status === "error")
    return <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{msg}</p>;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {qr && (
        <div className="rounded-lg bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${qr}`} alt="QR Code PIX" width={200} height={200} />
        </div>
      )}

      <div className="w-full">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">PIX copia e cola</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={copia}
            className="w-full truncate rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-xs text-gray-300 outline-none"
          />
          <button onClick={copy} className="btn-outline shrink-0">
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-amber-300">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
        Aguardando o pagamento... (confirma sozinho assim que você pagar)
      </div>
      <p className="text-[11px] text-gray-500">
        Abra o app do seu banco, escolha PIX → Pagar com QR Code (ou cole o código) e confirme.
      </p>
    </div>
  );
}

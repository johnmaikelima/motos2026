"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateShippingLabel } from "@/server/shipping-actions";

export default function ShippingLabelButton({
  orderId,
  hasLabel,
}: {
  orderId: string;
  hasLabel: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const r = await generateShippingLabel(orderId);
      if (!r.ok) setError(r.message);
      else router.refresh();
    } catch {
      setError("Erro inesperado ao gerar a etiqueta.");
    } finally {
      setLoading(false);
    }
  }

  if (hasLabel) return null;

  return (
    <div className="mt-3">
      <button
        onClick={handle}
        disabled={loading}
        className="w-full rounded-lg bg-lime px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Gerando etiqueta…" : "Gerar etiqueta (Envia.com)"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

"use client";

import Image from "next/image";
import type { CartGift } from "@/lib/types";

/**
 * Linha do BRINDE no carrinho/checkout: valor zerado, tag "Brinde" e
 * seletor de tamanho (quando o brinde tem variações). Não é removível —
 * está vinculado à qualificação do pedido.
 */
export default function GiftCartLine({
  gift,
  size,
  setSize,
  compact = false,
}: {
  gift: CartGift;
  size: string;
  setSize: (s: string) => void;
  compact?: boolean;
}) {
  const sizes = gift.variants.map((v) => v.size ?? "").filter((s) => s !== "");
  const hasSizes = sizes.length > 0;

  const sizeSelect = hasSizes ? (
    <select
      value={size}
      onChange={(e) => setSize(e.target.value)}
      className="rounded-md border border-lime/40 bg-ink-800 px-2 py-1 text-xs text-white outline-none focus:border-lime"
    >
      {sizes.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  ) : null;

  if (compact) {
    return (
      <li className="flex items-center justify-between gap-2 text-sm">
        <span className="flex flex-wrap items-center gap-1.5 pr-2 text-gray-300">
          <span className="rounded bg-lime/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime">🎁 Brinde</span>
          <span>{gift.name}</span>
          {sizeSelect}
        </span>
        <span className="font-semibold text-lime">Grátis</span>
      </li>
    );
  }

  return (
    <div className="card flex gap-4 border-lime/40 p-4">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-lime/30 bg-ink-700">
        <Image src={gift.image} alt={gift.name} fill className="object-cover" sizes="96px" />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <span className="inline-block rounded bg-lime/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-lime">
            🎁 Brinde exclusivo
          </span>
          <p className="mt-1 text-sm font-semibold text-white">{gift.name}</p>
          {hasSizes && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Tamanho:</span>
              {sizeSelect}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Adicionado automaticamente</span>
          <p className="font-bold text-lime">Grátis</p>
        </div>
      </div>
    </div>
  );
}

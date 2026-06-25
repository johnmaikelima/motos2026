"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { CartIcon } from "./icons";
import SizeChartView from "./SizeChartView";

type SizeRow = { min: number; max: number; universal: string; europa: string; brasil: string };
type SizeChart = { name: string; measureLabel: string; rows: SizeRow[] };

export default function AddToCartPanel({ product, sizeChart }: { product: Product; sizeChart?: SizeChart }) {
  const { addItem } = useCart();
  const [size, setSize] = useState<string | undefined>(product.sizes?.[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        size,
      },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  const outOfStock = product.stock <= 0;

  return (
    <div className="flex flex-col gap-5">
      {product.sizes && product.sizes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Tamanho</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`min-w-[3rem] rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  size === s
                    ? "border-lime bg-lime text-black"
                    : "border-white/15 text-gray-200 hover:border-lime/60"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {sizeChart && (
            <div className="mt-3">
              <SizeChartView chart={sizeChart} variant="link" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-md border border-white/15">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-lg text-gray-300 hover:text-lime">−</button>
          <span className="w-10 text-center text-sm font-semibold">{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} className="px-3 py-2 text-lg text-gray-300 hover:text-lime">+</button>
        </div>
        <span className={`text-xs font-semibold ${outOfStock ? "text-red-400" : "text-lime"}`}>
          {outOfStock ? "Indisponível" : `${product.stock} em estoque`}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={handleAdd} disabled={outOfStock} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40">
          <CartIcon width={18} height={18} />
          {added ? "Adicionado!" : "Adicionar ao carrinho"}
        </button>
        <Link href="/carrinho" className="btn-outline justify-center sm:px-8">
          Ver carrinho
        </Link>
      </div>
    </div>
  );
}

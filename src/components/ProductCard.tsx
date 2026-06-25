"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { pixPrice } from "@/lib/pricing";
import { usePixDiscountPct } from "@/lib/pix-context";
import { useCart } from "@/lib/cart-context";
import { CartIcon, HeartIcon, StarIcon } from "./icons";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const pixPct = usePixDiscountPct();
  const [imgSrc, setImgSrc] = useState(product.image || "/placeholder.svg");

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:border-lime/30">
      <div className="relative aspect-square overflow-hidden bg-ink-700">
        <Link href={`/produto/${product.slug}`}>
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
            onError={() => setImgSrc("/placeholder.svg")}
          />
        </Link>
        <button
          aria-label="Favoritar"
          className="absolute right-3 top-3 rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:text-lime"
        >
          <HeartIcon width={18} height={18} />
        </button>
        {product.listPrice && product.listPrice > product.price && (
          <span className="absolute left-3 top-3 rounded bg-lime px-2 py-1 text-[10px] font-bold uppercase text-black">
            Oferta
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/produto/${product.slug}`} className="line-clamp-2 text-sm font-semibold text-white hover:text-lime">
          {product.name}
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {product.reviews > 0 ? (
            <>
              <span className="flex text-lime">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    width={13}
                    height={13}
                    className={i < Math.round(product.rating) ? "text-lime" : "text-gray-600"}
                  />
                ))}
              </span>
              <span>({product.reviews})</span>
            </>
          ) : (
            <span className="text-gray-600">Sem avaliações</span>
          )}
        </div>

        <div className="mt-auto">
          {product.listPrice && product.listPrice > product.price && (
            <p className="text-xs text-gray-500 line-through">{formatBRL(product.listPrice)}</p>
          )}
          <p className="text-xl font-extrabold text-lime">{formatBRL(product.price)}</p>
          {product.installments && (
            <p className="text-xs text-gray-400">
              {product.installments.count}x de {formatBRL(product.installments.value)} sem juros
            </p>
          )}
          {pixPct > 0 && (
            <p className="text-xs font-semibold text-lime">{formatBRL(pixPrice(product.price, pixPct))} no PIX</p>
          )}
        </div>

        <button
          onClick={() =>
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.image,
            })
          }
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-md border border-lime/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-lime transition hover:bg-lime hover:text-black"
        >
          <CartIcon width={16} height={16} />
          Comprar
        </button>
      </div>
    </article>
  );
}

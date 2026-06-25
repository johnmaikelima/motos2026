"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatBRL } from "@/lib/format";
import { pixPrice } from "@/lib/pricing";
import { usePixDiscountPct } from "@/lib/pix-context";

export default function CartPage() {
  const { items, subtotal, setQty, removeItem } = useCart();
  const pixPct = usePixDiscountPct();

  if (items.length === 0) {
    return (
      <div className="container-rm flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="heading-display text-3xl text-white">Seu carrinho está vazio</h1>
        <p className="text-sm text-gray-400">Que tal escolher uma jaqueta para sua próxima viagem?</p>
        <Link href="/produtos" className="btn-primary">Ver coleção</Link>
      </div>
    );
  }

  return (
    <div className="container-rm py-10">
      <h1 className="heading-display mb-8 text-3xl text-white">Carrinho</h1>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={`${item.productId}-${item.size ?? ""}`} className="card flex gap-4 p-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-ink-700">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/produto/${item.slug}`} className="text-sm font-semibold text-white hover:text-lime">{item.name}</Link>
                    {item.size && <p className="text-xs text-gray-400">Tamanho: {item.size}</p>}
                  </div>
                  <button onClick={() => removeItem(item.productId, item.size)} className="text-xs text-gray-500 hover:text-red-400">Remover</button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-md border border-white/15">
                    <button onClick={() => setQty(item.productId, item.qty - 1, item.size)} className="px-3 py-1.5 text-gray-300 hover:text-lime">−</button>
                    <span className="w-8 text-center text-sm">{item.qty}</span>
                    <button onClick={() => setQty(item.productId, item.qty + 1, item.size)} className="px-3 py-1.5 text-gray-300 hover:text-lime">+</button>
                  </div>
                  <p className="font-bold text-lime">{formatBRL(item.price * item.qty)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="card h-max p-6">
          <h2 className="heading-display text-xl text-white">Resumo</h2>
          <div className="mt-4 flex justify-between text-sm text-gray-300">
            <span>Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-gray-400">
            <span>Frete</span>
            <span>calculado no checkout</span>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex justify-between text-lg font-bold text-white">
              <span>Total</span>
              <span className="text-lime">{formatBRL(subtotal)}</span>
            </div>
            {pixPct > 0 && (
              <div className="mt-1 flex justify-between text-sm font-semibold text-lime">
                <span>À vista no PIX ({pixPct}% off)</span>
                <span>{formatBRL(pixPrice(subtotal, pixPct))}</span>
              </div>
            )}
          </div>
          <Link href="/checkout" className="btn-primary mt-6 w-full">Finalizar compra</Link>
          <p className="mt-3 text-center text-[11px] text-gray-500">Pagamento processado com segurança.</p>
        </aside>
      </div>
    </div>
  );
}

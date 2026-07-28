"use client";

import { useEffect, useState } from "react";
import { getCartGift } from "@/server/promotion-actions";
import type { CartGift } from "@/lib/types";

const SIZE_KEY = "runmotos:giftSize";

/**
 * Resolve o brinde do carrinho (1 por pedido) e guarda o tamanho escolhido
 * (persistido em localStorage para o checkout reaproveitar).
 */
export function useCartGift(productIds: string[]) {
  // chave estável (ordem e duplicatas não importam)
  const key = [...new Set(productIds.filter(Boolean))].sort().join(",");
  const [gift, setGift] = useState<CartGift | null>(null);
  const [size, setSizeState] = useState<string>("");

  // carrega o tamanho salvo
  useEffect(() => {
    try {
      setSizeState(localStorage.getItem(SIZE_KEY) ?? "");
    } catch {}
  }, []);

  // busca o brinde sempre que o conjunto de produtos muda
  useEffect(() => {
    let on = true;
    if (!key) {
      setGift(null);
      return;
    }
    getCartGift(key.split(",")).then((g) => {
      if (on) setGift(g);
    });
    return () => {
      on = false;
    };
  }, [key]);

  function setSize(s: string) {
    setSizeState(s);
    try {
      localStorage.setItem(SIZE_KEY, s);
    } catch {}
  }

  // garante que o tamanho escolhido exista nas variações do brinde atual
  useEffect(() => {
    if (!gift) return;
    const sizes = gift.variants.map((v) => v.size ?? "");
    if (sizes.length && !sizes.includes(size)) setSize(sizes[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gift]);

  return { gift, size, setSize };
}

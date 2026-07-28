"use client";

import { createContext, useContext } from "react";
import { DEFAULT_PIX_DISCOUNT_PCT } from "./pricing";

/** Disponibiliza a % de desconto do PIX (configurável) para componentes de cliente. */
const PixCtx = createContext<number>(DEFAULT_PIX_DISCOUNT_PCT);

export function PixDiscountProvider({ pct, children }: { pct: number; children: React.ReactNode }) {
  return <PixCtx.Provider value={pct}>{children}</PixCtx.Provider>;
}

export function usePixDiscountPct(): number {
  return useContext(PixCtx);
}

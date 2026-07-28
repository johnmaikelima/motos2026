import "server-only";
import { prisma } from "./db";

export type StoreSettings = {
  storeName: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  address: string;
  instagram: string;
  facebook: string;
  youtube: string;
  originCep: string;
  pixDiscountPct: number;
};

const DEFAULTS: StoreSettings = {
  storeName: "RunMotos",
  logoUrl: "",
  contactEmail: "",
  contactPhone: "",
  whatsapp: "",
  address: "",
  instagram: "",
  facebook: "",
  youtube: "",
  originCep: "",
  pixDiscountPct: 5,
};

/** Configurações da loja (linha única id=1). Não escreve no banco em leitura. */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const s = await prisma.setting.findUnique({ where: { id: 1 } });
    if (!s) return DEFAULTS;
    return {
      storeName: s.storeName || "RunMotos",
      logoUrl: s.logoUrl ?? "",
      contactEmail: s.contactEmail ?? "",
      contactPhone: s.contactPhone ?? "",
      whatsapp: s.whatsapp ?? "",
      address: s.address ?? "",
      instagram: s.instagram ?? "",
      facebook: s.facebook ?? "",
      youtube: s.youtube ?? "",
      originCep: s.originCep ?? "",
      pixDiscountPct: s.pixDiscountPct ?? 5,
    };
  } catch {
    return DEFAULTS;
  }
}

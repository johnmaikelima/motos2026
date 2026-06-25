"use server";

import { requireAdmin } from "./admin-guard";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { StoreSettings } from "@/lib/store-settings";

export type SettingsResult = { ok: boolean; message: string };

export async function saveStoreSettings(input: StoreSettings): Promise<SettingsResult> {
  await requireAdmin();
  try {
    const data = {
      storeName: input.storeName.trim() || "RunMotos",
      logoUrl: input.logoUrl.trim() || null,
      contactEmail: input.contactEmail.trim() || null,
      contactPhone: input.contactPhone.trim() || null,
      whatsapp: input.whatsapp.trim() || null,
      address: input.address.trim() || null,
      instagram: input.instagram.trim() || null,
      facebook: input.facebook.trim() || null,
      youtube: input.youtube.trim() || null,
      originCep: input.originCep.replace(/\D/g, "") || null,
      pixDiscountPct: Math.min(50, Math.max(0, Number(input.pixDiscountPct) || 0)),
    };
    await prisma.setting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    // Revalida tudo (header/footer aparecem em todo o site)
    revalidatePath("/", "layout");
    return { ok: true, message: "Configurações salvas." };
  } catch (err) {
    console.warn("[settings] save:", (err as Error)?.message);
    return { ok: false, message: "Erro ao salvar as configurações." };
  }
}

"use server";

import { requireAdmin } from "./admin-guard";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export type HomeCategoriesResult = { ok: boolean; message: string };

export async function saveHomeCategories(categories: string[]): Promise<HomeCategoriesResult> {
  await requireAdmin();
  try {
    const clean = categories.map((c) => c.trim()).filter(Boolean);
    // [] = mostrar todas automaticamente → guardamos null
    const value = clean.length ? JSON.stringify(clean) : null;
    await prisma.setting.upsert({
      where: { id: 1 },
      update: { homeCategories: value },
      create: { id: 1, homeCategories: value },
    });
    revalidatePath("/");
    return { ok: true, message: "Categorias da página inicial salvas." };
  } catch (err) {
    console.warn("[home-categories] save:", (err as Error)?.message);
    return { ok: false, message: "Erro ao salvar." };
  }
}

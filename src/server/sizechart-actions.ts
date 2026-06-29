"use server";

import { requireAdmin } from "./admin-guard";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { SizeRow } from "@/lib/sizecharts";

export type SizeChartResult = { ok: boolean; message: string };

export type SaveSizeChartInput = {
  id?: string;
  name: string;
  measureLabel: string;
  rows: SizeRow[];
  categories: string[];
};

export async function saveSizeChart(input: SaveSizeChartInput): Promise<SizeChartResult> {
  await requireAdmin();
  try {
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Informe o nome da tabela." };
    if (input.rows.length === 0) return { ok: false, message: "Adicione ao menos uma faixa de medida." };

    const data = {
      name,
      measureLabel: input.measureLabel.trim() || "Medida do peito (cm)",
      data: JSON.stringify(input.rows),
      categories: JSON.stringify(input.categories),
    };

    if (input.id) {
      await prisma.sizeChart.update({ where: { id: input.id }, data });
    } else {
      await prisma.sizeChart.create({ data: { ...data, active: true } });
    }
    revalidatePath("/admin/tamanhos");
    revalidatePath("/produtos");
    return { ok: true, message: "Tabela salva." };
  } catch (err) {
    console.warn("[sizechart] save:", (err as Error)?.message);
    return { ok: false, message: "Erro ao salvar a tabela." };
  }
}

/** Tabelas de tamanho PADRÃO (Jaquetas). Usadas para semear num ambiente novo. */
const DEFAULT_CHARTS: { name: string; categories: string[]; rows: SizeRow[] }[] = [
  {
    name: "Jaquetas Femininas",
    categories: ["Jaquetas Femininas"],
    rows: [
      { min: 84, max: 87, universal: "XS", europa: "46", brasil: "PP" },
      { min: 88, max: 91, universal: "S", europa: "48", brasil: "P" },
      { min: 92, max: 95, universal: "M", europa: "50", brasil: "M" },
      { min: 96, max: 103, universal: "L", europa: "52", brasil: "G" },
      { min: 104, max: 113, universal: "XL", europa: "54", brasil: "GG" },
      { min: 114, max: 123, universal: "2XL", europa: "56", brasil: "3G" },
      { min: 124, max: 135, universal: "3XL", europa: "58", brasil: "4G" },
      { min: 136, max: 147, universal: "4XL", europa: "60", brasil: "5G" },
      { min: 148, max: 159, universal: "5XL", europa: "62", brasil: "6G" },
      { min: 160, max: 172, universal: "6XL", europa: "64", brasil: "7G" },
    ],
  },
  {
    name: "Jaquetas Masculinas",
    categories: ["Jaquetas Masculinas"],
    rows: [
      { min: 84, max: 87, universal: "XS", europa: "46", brasil: "PP" },
      { min: 88, max: 91, universal: "S", europa: "48", brasil: "P" },
      { min: 92, max: 95, universal: "M", europa: "50", brasil: "M" },
      { min: 96, max: 103, universal: "L", europa: "52", brasil: "G" },
      { min: 104, max: 113, universal: "XL", europa: "54", brasil: "GG" },
      { min: 114, max: 123, universal: "2XL", europa: "56", brasil: "3G" },
      { min: 124, max: 135, universal: "3XL", europa: "58", brasil: "4G" },
      { min: 136, max: 146, universal: "4XL", europa: "60", brasil: "5G" },
      { min: 147, max: 159, universal: "5XL", europa: "62", brasil: "6G" },
      { min: 160, max: 172, universal: "6XL", europa: "64", brasil: "7G" },
      { min: 173, max: 185, universal: "7XL", europa: "66", brasil: "8G" },
      { min: 186, max: 198, universal: "8XL", europa: "68", brasil: "9G" },
      { min: 199, max: 211, universal: "9XL", europa: "70", brasil: "10G" },
      { min: 212, max: 224, universal: "10XL", europa: "72", brasil: "11G" },
      { min: 225, max: 237, universal: "11XL", europa: "74", brasil: "12G" },
    ],
  },
];

/** Cria as tabelas padrão que ainda não existirem (por nome). Idempotente. */
export async function seedDefaultSizeCharts(): Promise<SizeChartResult> {
  await requireAdmin();
  try {
    const existing = await prisma.sizeChart.findMany({ select: { name: true } });
    const have = new Set(existing.map((c) => c.name));
    let criadas = 0;
    for (const c of DEFAULT_CHARTS) {
      if (have.has(c.name)) continue;
      await prisma.sizeChart.create({
        data: {
          name: c.name,
          measureLabel: "Medida do peito (cm)",
          data: JSON.stringify(c.rows),
          categories: JSON.stringify(c.categories),
          active: true,
        },
      });
      criadas++;
    }
    revalidatePath("/admin/tamanhos");
    revalidatePath("/produtos");
    return {
      ok: true,
      message: criadas > 0 ? `${criadas} tabela(s) padrão criada(s).` : "As tabelas padrão já existem.",
    };
  } catch (err) {
    console.warn("[sizechart] seed:", (err as Error)?.message);
    return { ok: false, message: "Erro ao restaurar tabelas padrão." };
  }
}

export async function deleteSizeChart(id: string): Promise<SizeChartResult> {
  await requireAdmin();
  try {
    await prisma.sizeChart.delete({ where: { id } });
    revalidatePath("/admin/tamanhos");
    revalidatePath("/produtos");
    return { ok: true, message: "Tabela excluída." };
  } catch (err) {
    console.warn("[sizechart] delete:", (err as Error)?.message);
    return { ok: false, message: "Erro ao excluir." };
  }
}

import "server-only";
import { prisma } from "./db";

export type SizeRow = { min: number; max: number; universal: string; europa: string; brasil: string };
export type SizeChartData = {
  id: string;
  name: string;
  measureLabel: string;
  rows: SizeRow[];
  categories: string[];
  active: boolean;
};

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

type Raw = { id: string; name: string; measureLabel: string; data: string; categories: string; active: boolean };

function parse(r: Raw): SizeChartData {
  return {
    id: r.id,
    name: r.name,
    measureLabel: r.measureLabel,
    rows: safeJson<SizeRow[]>(r.data, []),
    categories: safeJson<string[]>(r.categories, []),
    active: r.active,
  };
}

export async function listSizeCharts(): Promise<SizeChartData[]> {
  const rows = await prisma.sizeChart.findMany({ orderBy: { name: "asc" } });
  return rows.map(parse);
}

/** Acha a tabela de tamanhos que se aplica a um produto (subcategoria > categoria). */
export async function getSizeChartForProduct(
  categoria: string | null,
  subcategoria: string | null
): Promise<SizeChartData | null> {
  if (!categoria && !subcategoria) return null;
  const charts = (await prisma.sizeChart.findMany({ where: { active: true } })).map(parse);
  if (subcategoria) {
    const m = charts.find((c) => c.categories.includes(subcategoria));
    if (m) return m;
  }
  if (categoria) {
    const m = charts.find((c) => c.categories.includes(categoria));
    if (m) return m;
  }
  return null;
}

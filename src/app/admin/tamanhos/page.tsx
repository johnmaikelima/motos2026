import { prisma } from "@/lib/db";
import { listSizeCharts } from "@/lib/sizecharts";
import SizeChartManager from "@/components/admin/SizeChartManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tabelas de tamanho" };

export default async function TamanhosPage() {
  const [charts, products] = await Promise.all([
    listSizeCharts(),
    prisma.product.findMany({ where: { active: true }, select: { categoria: true, subcategoria: true } }),
  ]);

  const set = new Set<string>();
  for (const p of products) {
    if (p.categoria) set.add(p.categoria);
    if (p.subcategoria) set.add(p.subcategoria);
  }
  const availableCategories = [...set].sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <h1 className="heading-display mb-2 text-3xl text-white">Tabelas de tamanho</h1>
      <p className="mb-6 text-sm text-gray-400">
        Crie tabelas e vincule a categorias/subcategorias. A tabela aparece na página dos produtos dessas categorias,
        com o cálculo pela medida do cliente.
      </p>
      <SizeChartManager charts={charts} availableCategories={availableCategories} />
    </div>
  );
}

import { prisma } from "@/lib/db";
import CatalogActions from "@/components/admin/CatalogActions";
import CategoryManager from "@/components/admin/CategoryManager";
import SpreadsheetPanel from "@/components/admin/SpreadsheetPanel";
import DescriptionsImportPanel from "@/components/admin/DescriptionsImportPanel";
import DangerZone from "@/components/admin/DangerZone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Importar produtos" };

export default async function ImportarPage() {
  const [categories, totalProdutos] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.count(),
  ]);

  const categoryRows = categories.map((c) => ({
    code: c.code,
    name: c.name,
    tagline: c.tagline,
    importEnabled: c.importEnabled,
    active: c.active,
    isDefault: c.isDefault,
    productCount: c.productCount,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="heading-display text-3xl text-white">Importar produtos</h1>
          <p className="mt-1 text-sm text-gray-400">
            Cadastre/atualize o catálogo pela planilha da Laquila. {totalProdutos} produto(s) no banco.
          </p>
        </div>
        <CatalogActions />
      </div>

      <div className="flex flex-col gap-8">
        <SpreadsheetPanel />
        <DescriptionsImportPanel />
        {/* key muda quando as marcas/seleção mudam -> remonta com os dados novos */}
        <CategoryManager
          key={categoryRows.map((c) => `${c.code}:${c.importEnabled ? 1 : 0}:${c.active ? 1 : 0}`).join("|")}
          initial={categoryRows}
        />
        <DangerZone total={totalProdutos} />
      </div>
    </div>
  );
}

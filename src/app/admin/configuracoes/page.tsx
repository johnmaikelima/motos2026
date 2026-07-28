import { getStoreSettings } from "@/lib/store-settings";
import { getHomeCategories } from "@/lib/home-settings";
import { prisma } from "@/lib/db";
import StoreSettingsForm from "@/components/admin/StoreSettingsForm";
import HomeCategoriesManager from "@/components/admin/HomeCategoriesManager";
import FeedLinkCard from "@/components/admin/FeedLinkCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const [settings, homeCategories, products] = await Promise.all([
    getStoreSettings(),
    getHomeCategories(),
    prisma.product.findMany({ where: { active: true }, select: { categoria: true } }),
  ]);

  // Categorias disponíveis (com contagem), ordenadas por quantidade.
  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.categoria) continue;
    counts.set(p.categoria, (counts.get(p.categoria) ?? 0) + 1);
  }
  const available = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="heading-display mb-2 text-3xl text-white">Configurações da loja</h1>
        <p className="mb-6 text-sm text-gray-400">
          Nome, logo, contato e redes sociais. As mudanças aparecem na loja imediatamente.
        </p>
        <StoreSettingsForm initial={settings} />
      </div>

      <HomeCategoriesManager available={available} selected={homeCategories} />

      <FeedLinkCard />
    </div>
  );
}

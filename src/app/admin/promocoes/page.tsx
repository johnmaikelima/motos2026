import { prisma } from "@/lib/db";
import { profitOf } from "@/lib/promotions";
import PromotionManager, { type PromoRow } from "@/components/admin/PromotionManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promoções" };

export default async function PromocoesPage() {
  const [promotions, productsRaw] = await Promise.all([
    prisma.promotion.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, image: true, variants: { select: { price: true, cost: true, stock: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const products = productsRaw.map((p) => ({ id: p.id, name: p.name, image: p.image }));
  const profitById = new Map(productsRaw.map((p) => [p.id, profitOf(p.variants)]));

  const rows: PromoRow[] = promotions.map((pr) => {
    const gift = productsRaw.find((p) => p.id === pr.giftProductId);
    const qualifies = productsRaw.filter((p) => {
      const pf = profitById.get(p.id);
      return pf != null && pf >= pr.minProfit && p.id !== pr.giftProductId;
    }).length;
    return {
      id: pr.id,
      name: pr.name,
      minProfit: pr.minProfit,
      giftProductId: pr.giftProductId,
      active: pr.active,
      giftName: gift?.name,
      giftImage: gift?.image,
      qualifies,
    };
  });

  return (
    <div>
      <h1 className="heading-display mb-2 text-3xl text-white">Promoções</h1>
      <p className="mb-6 text-sm text-gray-400">
        Crie regras automáticas. Hoje: <strong>brinde por lucro</strong> — produtos com lucro acima do valor
        definido exibem um card de brinde na página do produto.
      </p>

      {products.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          Importe produtos primeiro para criar regras de brinde.
        </div>
      ) : (
        <PromotionManager products={products} promotions={rows} />
      )}
    </div>
  );
}

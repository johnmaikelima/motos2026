import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getCategory, getRelatedProducts } from "@/lib/products";
import { getGiftForProduct } from "@/lib/promotions";
import { getSizeChartForProduct } from "@/lib/sizecharts";
import { getReviewState } from "@/server/review-actions";
import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { pixPrice } from "@/lib/pricing";
import { getStoreSettings } from "@/lib/store-settings";
import AddToCartPanel from "@/components/AddToCartPanel";
import ProductGallery from "@/components/ProductGallery";
import GiftCard from "@/components/GiftCard";
import ReviewForm from "@/components/ReviewForm";
import ShippingCalculator from "@/components/ShippingCalculator";
import ProductCard from "@/components/ProductCard";
import { StarIcon } from "@/components/icons";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Dinâmico: reflete estoque, categorias e promoções na hora.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [category, gift, reviews, reviewState, sizeChart, related, settings] = await Promise.all([
    getCategory(product.categorySlug),
    getGiftForProduct(product.id),
    prisma.review.findMany({ where: { productId: product.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    getReviewState(product.id),
    getSizeChartForProduct(product.categoria ?? null, product.subcategoria ?? null),
    getRelatedProducts(product, 4),
    getStoreSettings(),
  ]);
  const pixPct = settings.pixDiscountPct;

  // Dados estruturados schema.org/Product — lidos pelo Google e pelo Merchant Center.
  // Imagens válidas para o feed (sem placeholder — o Merchant rejeita SVG/placeholder).
  const feedImages = [product.image, ...(product.gallery ?? [])].filter(
    (u) => u && u !== "/placeholder.svg",
  );
  // Validade do preço (recomendado pelo Google nas ofertas): +1 ano.
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(feedImages.length ? { image: feedImages } : {}),
    description: product.description,
    sku: product.id,
    ...(product.ean ? { gtin13: product.ean } : {}),
    brand: { "@type": "Brand", name: product.brand },
    // Só inclui avaliação quando HÁ avaliações reais (reviewCount 0 é inválido p/ o Google).
    ...(product.reviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviews,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/produto/${product.slug}`,
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      priceValidUntil,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="container-rm py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-lime">Início</Link>
        <span>/</span>
        {category && (
          <>
            <Link href={`/categoria/${category.slug}`} className="hover:text-lime">{category.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-300">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery
          images={[product.image, ...(product.gallery ?? [])]
            .filter((v, i, a) => v && a.indexOf(v) === i)
            .filter((u) => u !== "/placeholder.svg")}
          alt={product.name}
        />

        <div className="flex flex-col gap-5">
          {category && (
            <Link href={`/categoria/${category.slug}`} className="text-xs font-bold uppercase tracking-widest text-lime">
              {category.name}
            </Link>
          )}
          <h1 className="heading-display text-3xl text-white sm:text-4xl">{product.name}</h1>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            {product.reviews > 0 ? (
              <>
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} width={15} height={15} className={i < Math.round(product.rating) ? "text-lime" : "text-gray-600"} />
                  ))}
                </span>
                <span>{product.rating.toFixed(1)} ({product.reviews} avaliação(ões))</span>
              </>
            ) : (
              <span className="text-gray-500">Sem avaliações ainda</span>
            )}
          </div>

          <div>
            {product.listPrice && product.listPrice > product.price && (
              <p className="text-sm text-gray-500 line-through">{formatBRL(product.listPrice)}</p>
            )}
            {pixPct > 0 ? (
              <>
                {/* PIX em destaque (menor preço) */}
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-extrabold text-lime">{formatBRL(pixPrice(product.price, pixPct))}</p>
                  <span className="rounded bg-lime/15 px-2 py-0.5 text-xs font-bold uppercase text-lime">no PIX · {pixPct}% off</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  ou {formatBRL(product.price)} no cartão
                  {product.installments && <> em até {product.installments.count}x de {formatBRL(product.installments.value)} sem juros</>}
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl font-extrabold text-lime">{formatBRL(product.price)}</p>
                {product.installments && (
                  <p className="text-sm text-gray-400">
                    em até {product.installments.count}x de {formatBRL(product.installments.value)} sem juros
                  </p>
                )}
              </>
            )}
          </div>

          {gift && <GiftCard gift={gift} />}

          <AddToCartPanel
            product={product}
            sizeChart={sizeChart ? { name: sizeChart.name, measureLabel: sizeChart.measureLabel, rows: sizeChart.rows } : undefined}
          />

          <ShippingCalculator slug={product.slug} />
        </div>
      </div>

      {/* Descrição */}
      {product.description && product.description !== product.name && (
        <section className="mt-12 border-t border-white/5 pt-8">
          <h2 className="heading-display mb-4 text-2xl text-white">Descrição</h2>
          <div className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-gray-300">
            {product.description}
          </div>
        </section>
      )}

      {/* Avaliações */}
      <section className="mt-12 border-t border-white/5 pt-8">
        <h2 className="heading-display mb-4 text-2xl text-white">Avaliações</h2>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-400">Este produto ainda não tem avaliações.</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{r.authorName || "Cliente"}</span>
                    <span className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} width={13} height={13} className={i < r.rating ? "text-lime" : "text-gray-600"} />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-gray-300">{r.comment}</p>}
                  <p className="mt-1 text-[11px] text-gray-500">{r.createdAt.toLocaleDateString("pt-BR")}</p>
                </div>
              ))
            )}
          </div>

          <div>
            <ReviewForm productId={product.id} state={reviewState} />
          </div>
        </div>
      </section>

      {/* Produtos relacionados */}
      {related.length > 0 && (
        <section className="mt-12 border-t border-white/5 pt-8">
          <h2 className="heading-display mb-6 flex items-center gap-3 text-2xl text-white">
            <span className="h-px w-8 bg-lime" /> Você também pode gostar
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

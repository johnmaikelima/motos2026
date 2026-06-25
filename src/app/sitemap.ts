import type { MetadataRoute } from "next";
import { getAllProducts, getCategories } from "@/lib/products";

// Gera em runtime (com produtos reais), não no build (onde o banco não está acessível).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);

  const staticPages = [
    "",
    "/sobre",
    "/contato",
    "/politica-de-envio",
    "/trocas-e-devolucoes",
    "/politica-de-privacidade",
    "/termos-de-uso",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  const categoryPages = categories.map((c) => ({
    url: `${SITE_URL}/categoria/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const productPages = products.map((p) => ({
    url: `${SITE_URL}/produto/${p.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}

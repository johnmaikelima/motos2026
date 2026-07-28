import { prisma } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Feed Google Shopping (RSS 2.0 + namespace g:).
 * Cadastre no Merchant Center: https://SEU-DOMINIO/api/merchant-feed
 *
 * Uma <item> por VARIAÇÃO (tamanho), agrupadas por item_group_id.
 * Docs: https://support.google.com/merchants/answer/7052112
 */
// Gera sob demanda (runtime), NÃO no build — assim não acessa o banco durante o build.
export const dynamic = "force-dynamic";

const PLACEHOLDER = "/placeholder.svg";

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function abs(siteUrl: string, u: string | null | undefined): string {
  const v = (u || "").trim();
  if (!v || v === PLACEHOLDER) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${siteUrl}${v.startsWith("/") ? "" : "/"}${v}`;
}

function genderOf(name: string, sub: string | null): "male" | "female" | null {
  const s = `${sub ?? ""} ${name}`.toLowerCase();
  if (/femin|\bfem\b|lady/.test(s)) return "female";
  if (/mascul|\bmasc\b/.test(s)) return "male";
  return null;
}

export async function GET() {
  const SITE_URL = await getSiteUrl();

  const products = await prisma.product
    .findMany({ where: { active: true }, include: { variants: true } })
    .catch(() => []);

  const blocks: string[] = [];

  for (const p of products) {
    const gallery = p.gallery ? p.gallery.split(",").map((s) => s.trim()).filter(Boolean) : [];
    // Imagem principal absoluta (ignora placeholder). Sem imagem válida => não envia.
    const allImgs = [p.image, ...gallery].map((u) => abs(SITE_URL, u)).filter(Boolean);
    const mainImg = allImgs[0];
    if (!mainImg) continue;
    const extraImgs = [...new Set(allImgs.slice(1))].filter((u) => u !== mainImg).slice(0, 10);

    const link = `${SITE_URL}/produto/${p.slug}`;
    const title = esc(p.name || p.brand || "Produto");
    const description = esc(p.description || p.name || "");
    const brand = esc(p.brand || "RunMotos");
    const gender = genderOf(p.name, p.subcategoria);
    const productType = esc([p.categoria, p.subcategoria].filter(Boolean).join(" > ") || p.brand);
    const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    for (const v of p.variants) {
      const color = esc(v.color || p.color || "");
      const size = esc(v.size || "");
      const hasGtin = !!v.ean;

      blocks.push(`
    <item>
      <g:id>${esc(v.cdItem)}</g:id>
      <g:item_group_id>${esc(p.id)}</g:item_group_id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${esc(link)}</g:link>
      <g:image_link>${esc(mainImg)}</g:image_link>${extraImgs
        .map((u) => `\n      <g:additional_image_link>${esc(u)}</g:additional_image_link>`)
        .join("")}
      <g:availability>${v.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${v.price.toFixed(2)} BRL</g:price>
      <g:price_valid_until>${priceValidUntil}</g:price_valid_until>
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>${hasGtin ? "yes" : "no"}</g:identifier_exists>${hasGtin ? `\n      <g:gtin>${esc(v.ean!)}</g:gtin>` : ""}${size ? `\n      <g:size>${size}</g:size>` : ""}${color ? `\n      <g:color>${color}</g:color>` : ""}${gender ? `\n      <g:gender>${gender}</g:gender>` : ""}
      <g:age_group>adult</g:age_group>
      <g:product_type>${productType}</g:product_type>
    </item>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>RunMotos</title>
    <link>${esc(SITE_URL)}</link>
    <description>Equipamentos e vestuário para motociclistas</description>${blocks.join("")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

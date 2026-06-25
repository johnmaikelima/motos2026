"use server";

import { requireAdmin } from "./admin-guard";
/**
 * Ações do catálogo — rodam SOMENTE no servidor.
 *
 * Fluxo real (confirmado com a Laquila):
 *   - PRODUTOS: cadastrados via PLANILHA (a API não cadastra).
 *       1) Analisar planilha -> descobre as marcas (sub-grupo, coluna AB)
 *       2) Marcar quais marcas importar + nomear/markup
 *       3) Importar planilha -> grava só as marcas marcadas E com saldo > 0
 *   - ESTOQUE/PREÇO: atualizados depois pela API (00006/00017/00018)
 *   - PEDIDOS: criados/consultados pela API (00002/00008)
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
import { parseXlsx, parseXlsxAllSheets, num, type XlsxRow } from "@/lib/xlsx";
import { precoVenda } from "@/lib/format";
import { classifyProducts, isOpenAIConfigured } from "@/lib/openai";
import { localizeImage, isLocalImageValid } from "@/lib/image-download";
import { prettifyName } from "@/lib/product-name";
import { syncStockFromApi } from "@/lib/stock-sync";
import { getItemDetails } from "@/lib/laquila";

export type ActionResult = { ok: boolean; message: string };

const PLACEHOLDER = "/placeholder.svg";
const SEM_MARCA = "SEM MARCA";

/*
 * Layout da planilha (com a coluna "Produto" adicionada em D):
 *  B=Cod.item(SKU)  C=Descrição  D=PRODUTO(agrupador)  E=EAN  F=Compl.  G=Caract.
 *  H=Cor  I=TAMANHO(variação)  L=Cest  P=Unidade  Q=NCM  R=Vl custo  S=Vl sugerido
 *  T=Saldo  U/V/W=dims caixa  X=M3  Y=Peso líq  Z=Peso bruto
 *  AA=grande grupo  AB=grupo  AC=sub-grupo(MARCA=categoria)  AE=Lista de fotos
 */
function brandOf(row: XlsxRow): string {
  return (row.AC || "").trim() || SEM_MARCA; // sub-grupo = marca
}

// Nome agrupador do produto: coluna D (já tratada). Fallback p/ Descrição (C).
function productNameOf(row: XlsxRow): string {
  return (row.D || "").trim() || (row.C || "").trim();
}

function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 4);
}

function fotosOf(row: XlsxRow): string[] {
  return (row.AE || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

async function readUpload(formData: FormData): Promise<XlsxRow[]> {
  const file = formData.get("file");
  if (!file || typeof file === "string") throw new Error("Nenhum arquivo enviado.");
  const buf = Buffer.from(await (file as File).arrayBuffer());
  const rows = parseXlsx(buf);
  if (rows.length < 2) throw new Error("Planilha vazia ou em formato inesperado.");
  return rows.slice(1); // remove cabeçalho
}

/* ------------------------- ANALISAR PLANILHA ------------------------- */

/** Lê a planilha e descobre as marcas (categorias), sem importar produtos. */
export async function analyzeSpreadsheet(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    const data = await readUpload(formData);

    const counts = new Map<string, { total: number; comSaldo: number }>();
    for (const row of data) {
      const brand = brandOf(row);
      const c = counts.get(brand) ?? { total: 0, comSaldo: 0 };
      c.total++;
      if (num(row.T) > 0) c.comSaldo++; // saldo = coluna T
      counts.set(brand, c);
    }

    let novas = 0;
    for (const [brand, c] of counts) {
      const code = brand;
      const existing = await prisma.category.findUnique({ where: { code } });
      if (existing) {
        await prisma.category.update({ where: { code }, data: { productCount: c.comSaldo } });
      } else {
        await prisma.category.create({
          data: {
            code,
            name: brand,
            slug: slugify(brand) || `marca-${novas}`,
            productCount: c.comSaldo,
            importEnabled: false, // opt-in: você escolhe quais importar
            active: false,
          },
        });
        novas++;
      }
    }

    revalidatePath("/admin/importar");
    return {
      ok: true,
      message: `${counts.size} marca(s) encontrada(s) (${novas} nova(s)) em ${data.length} itens. Marque quais importar e clique em Importar.`,
    };
  } catch (err) {
    console.warn("[catalog] analyzeSpreadsheet:", (err as Error)?.message);
    return { ok: false, message: (err as Error)?.message ?? "Erro ao analisar a planilha." };
  }
}

/* ------------------------- IMPORTAR PLANILHA ------------------------- */

/**
 * Importa a planilha agrupando por PRODUTO (coluna D, repetida por variação).
 * A variação é o TAMANHO (coluna I). Só marcas habilitadas e itens com saldo > 0.
 * Não sobrescreve o nome de produtos que você já revisou (reviewed=true).
 */
export async function importSpreadsheet(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    const cats = await prisma.category.findMany();
    const enabled = new Set(cats.filter((c) => c.importEnabled).map((c) => c.code));
    if (enabled.size === 0) {
      return {
        ok: false,
        message: "Nenhuma marca marcada para importar. Analise a planilha e marque as marcas desejadas.",
      };
    }

    const data = await readUpload(formData);

    const productIds = new Map<string, string>(); // baseKey -> productId
    let variantes = 0;
    let pulados = 0;

    // Cache de localização de imagens para o run (evita rebaixar a mesma URL).
    const imgCache = new Map<string, string>();
    const localizeFotos = async (urls: string[]): Promise<string[]> => {
      const out: string[] = [];
      for (const u of urls) {
        let local = imgCache.get(u);
        if (local === undefined) {
          local = await localizeImage(u);
          imgCache.set(u, local);
        }
        out.push(local);
      }
      return out;
    };

    for (const row of data) {
      const brand = brandOf(row);
      if (!enabled.has(brand)) continue;
      if (num(row.T) <= 0) {
        pulados++;
        continue;
      }
      const cdItem = (row.B || "").trim();
      const produto = productNameOf(row); // coluna D (agrupador)
      if (!cdItem || !produto) continue;

      // Agrupa por PRODUTO (coluna D). Variação = tamanho (coluna I).
      const baseKey = slugify(produto) || produto.toLowerCase();
      const size = (row.I || "").trim() || null;
      const color = (row.H || "").trim() || null;
      const fotos = await localizeFotos(fotosOf(row)); // baixa p/ o servidor
      const cost = num(row.R);
      const sugerido = num(row.S);
      const price = precoVenda(cost, sugerido); // sugerido, ou (custo+10)×1,5

      // 1) Produto-pai (agrupa por baseKey = nome do produto)
      let productId = productIds.get(baseKey);
      if (!productId) {
        const existing = await prisma.product.findUnique({ where: { baseKey } });
        if (existing) {
          const updated = await prisma.product.update({
            where: { id: existing.id },
            data: {
              brand,
              categorySlug: slugify(brand),
              grupoCode: brand,
              grupo: (row.AB || "").trim() || null,
              grandeGrupo: (row.AA || "").trim() || null,
              color,
              ...(existing.reviewed ? {} : { name: prettifyName(produto) }),
              ...(existing.image === PLACEHOLDER && fotos[0] ? { image: fotos[0] } : {}),
            },
          });
          productId = updated.id;
        } else {
          const created = await prisma.product.create({
            data: {
              baseKey,
              slug: `${slugify(produto).slice(0, 70)}-${shortHash(produto)}`,
              name: prettifyName(produto),
              rawName: (row.C || "").trim() || produto,
              description: [(row.F || "").trim(), (row.G || "").trim()].filter(Boolean).join("\n\n") || produto,
              descricaoComplementar: (row.F || "").trim() || null,
              caracteristicas: (row.G || "").trim() || null,
              brand,
              categorySlug: slugify(brand),
              grupoCode: brand,
              grupo: (row.AB || "").trim() || null,
              grandeGrupo: (row.AA || "").trim() || null,
              color,
              image: fotos[0] || PLACEHOLDER,
              gallery: fotos.length ? fotos.join(",") : null,
              ncm: (row.Q || "").trim() || null,
              cest: (row.L || "").trim() || null,
              unidade: (row.P || "").trim() || null,
            },
          });
          productId = created.id;
        }
        productIds.set(baseKey, productId);
      }

      // 2) Variação (SKU). Eixo = tamanho (I).
      const variantData = {
        size,
        color,
        ean: (row.E || "").trim() || null,
        price,
        cost: cost || null,
        valorSugerido: sugerido || null,
        stock: Math.round(num(row.T)),
        pesoLiquido: num(row.Y) || null,
        pesoBruto: num(row.Z) || null,
        larguraCaixa: num(row.U) || null,
        alturaCaixa: num(row.V) || null,
        comprimentoCaixa: num(row.W) || null,
        m3Caixa: num(row.X) || null,
      };
      await prisma.variant.upsert({
        where: { cdItem },
        update: { productId, ...variantData, lastSyncedAt: new Date() },
        create: { productId, cdItem, ...variantData },
      });
      variantes++;
    }

    // Marcas importadas ficam visíveis; atualiza a contagem de PRODUTOS.
    for (const c of cats) {
      if (!enabled.has(c.code)) continue;
      const real = await prisma.product.count({ where: { grupoCode: c.code } });
      await prisma.category.update({ where: { code: c.code }, data: { productCount: real, active: true } });
    }

    revalidatePath("/admin/produtos");
    revalidatePath("/admin/importar");
    revalidatePath("/");
    return {
      ok: true,
      message: `${productIds.size} produto(s) e ${variantes} variação(ões) importadas. ${pulados} sem saldo ignorados.`,
    };
  } catch (err) {
    console.warn("[catalog] importSpreadsheet:", (err as Error)?.message);
    return { ok: false, message: (err as Error)?.message ?? "Erro ao importar a planilha." };
  }
}

/* ------------------------- BAIXAR IMAGENS P/ O SERVIDOR ------------------------- */

export type LocalizeResult = ActionResult & { processed: number; localized: number; remaining: number };

/**
 * Baixa para /public/uploads as imagens de produtos que ainda apontam para uma
 * URL remota (ex.: Laquila). Processa em lotes (`limit`) para não estourar tempo;
 * chame em loop até `remaining` chegar a 0. Idempotente (pula o que já existe).
 */
export async function localizeCatalogImages(limit = 25): Promise<LocalizeResult> {
  await requireAdmin();
  const where = { OR: [{ image: { startsWith: "http" } }, { gallery: { contains: "http" } }] };
  try {
    const products = await prisma.product.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "asc" },
      select: { id: true, image: true, gallery: true },
    });

    let processed = 0;
    let localized = 0;
    for (const p of products) {
      const image = await localizeImage(p.image);
      const gallery = p.gallery ? p.gallery.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const localGallery: string[] = [];
      for (const g of gallery) localGallery.push(await localizeImage(g));

      await prisma.product.update({
        where: { id: p.id },
        data: { image, gallery: localGallery.length ? localGallery.join(",") : null },
      });
      processed++;
      const stillRemote = /^https?:\/\//i.test(image) || localGallery.some((g) => /^https?:\/\//i.test(g));
      if (!stillRemote) localized++;
    }

    const remaining = await prisma.product.count({ where });
    if (processed > 0) {
      revalidatePath("/admin/produtos");
      revalidatePath("/admin/importar");
      revalidatePath("/");
    }
    return {
      ok: true,
      processed,
      localized,
      remaining,
      message:
        remaining > 0
          ? `${processed} processado(s) neste lote · ${remaining} restante(s)...`
          : "Concluído! Todas as imagens estão no seu servidor.",
    };
  } catch (err) {
    console.warn("[catalog] localizeCatalogImages:", (err as Error)?.message);
    return { ok: false, processed: 0, localized: 0, remaining: -1, message: "Erro ao baixar imagens." };
  }
}

/* ------------------------- IMPORTAR DESCRIÇÕES (planilha SKU+caract.) ------------------------- */

/**
 * Importa descrições de uma planilha: coluna A = SKU, coluna C = características.
 * Casa o SKU com a variação (cdItem) e aplica a descrição ao PRODUTO-pai.
 * Produtos variáveis: a mesma característica vale para todas as variações.
 */
export async function importDescriptions(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    const file = formData.get("file");
    if (!file || typeof file === "string") return { ok: false, message: "Envie a planilha (.xlsx)." };
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const rows = parseXlsxAllSheets(buf); // lê TODAS as abas (os dados podem estar na 2ª)

    // Normaliza o SKU: Excel às vezes grava como número ("1700012.0").
    const normSku = (s: string) => (s ?? "").toString().trim().split(/[.,]/)[0].trim();

    // Mapa SKU -> característica (coluna A e C). Pula cabeçalho/linhas vazias naturalmente.
    const bySku = new Map<string, string>();
    for (const r of rows) {
      const sku = normSku(r.A);
      const carac = (r.C ?? "").toString().trim();
      if (!sku || !carac) continue;
      bySku.set(sku, carac);
    }
    if (bySku.size === 0) {
      return { ok: false, message: "Não encontrei SKU (coluna A) + características (coluna C) na planilha." };
    }

    // Variação -> produto. Aplica a característica ao produto-pai (a mais completa, se houver +1).
    const variants = await prisma.variant.findMany({ select: { cdItem: true, productId: true } });
    const byProduct = new Map<string, string>();
    let matchedSkus = 0;
    for (const v of variants) {
      const carac = bySku.get(normSku(v.cdItem));
      if (!carac) continue;
      matchedSkus++;
      const cur = byProduct.get(v.productId);
      if (!cur || carac.length > cur.length) byProduct.set(v.productId, carac);
    }

    let updated = 0;
    for (const [productId, carac] of byProduct) {
      await prisma.product.update({ where: { id: productId }, data: { description: carac, caracteristicas: carac } });
      updated++;
    }

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");
    return {
      ok: true,
      message: `${updated} produto(s) com descrição atualizada · ${matchedSkus} SKU(s) casados de ${bySku.size} na planilha.`,
    };
  } catch (err) {
    console.warn("[catalog] importDescriptions:", (err as Error)?.message);
    return { ok: false, message: "Erro ao importar descrições (confira se é .xlsx com SKU em A e características em C)." };
  }
}

/* ------------------------- REPARAR IMAGENS QUEBRADAS ------------------------- */

export type RepairResult = ActionResult & { processed: number; repaired: number; cleared: number; remaining: number };

/** Extrai as URLs de foto do retorno do 00007 (campo lista_fotos, separado por vírgula). */
function fotosFromItem(item: Record<string, unknown> | null): string[] {
  const lista = item?.lista_fotos;
  if (typeof lista !== "string") return [];
  return lista.split(",").map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
}

/**
 * Conserta produtos cuja imagem local está QUEBRADA/faltando: busca as fotos pela
 * API (00007 lista_fotos por SKU), rebaixa validando, e atualiza o produto.
 * Se a Laquila não tiver foto, limpa para o placeholder (não fica imagem quebrada).
 * Processa em lotes; chame em loop até remaining = 0.
 */
export async function repairBrokenImages(limit = 12): Promise<RepairResult> {
  await requireAdmin();
  try {
    const products = await prisma.product.findMany({
      select: { id: true, image: true, variants: { select: { cdItem: true }, take: 1 } },
    });

    // Detecta os quebrados (imagem principal local inválida/faltando).
    const broken: { id: string; cdItem?: string }[] = [];
    for (const p of products) {
      if (await isLocalImageValid(p.image)) continue;
      broken.push({ id: p.id, cdItem: p.variants[0]?.cdItem });
    }
    const remainingBefore = broken.length;
    const batch = broken.slice(0, limit);

    let repaired = 0;
    let cleared = 0;
    for (const p of batch) {
      const localImgs: string[] = [];
      if (p.cdItem) {
        const res = (await getItemDetails(1, 1, p.cdItem)) as
          | { resultados?: { itens?: Array<{ item?: Record<string, unknown> }> } }
          | null;
        const urls = fotosFromItem(res?.resultados?.itens?.[0]?.item ?? null);
        for (const u of urls) {
          const local = await localizeImage(u);
          if (local.startsWith("/uploads/")) localImgs.push(local);
        }
      }
      if (localImgs.length) {
        await prisma.product.update({ where: { id: p.id }, data: { image: localImgs[0], gallery: localImgs.join(",") } });
        repaired++;
      } else {
        await prisma.product.update({ where: { id: p.id }, data: { image: PLACEHOLDER, gallery: null } });
        cleared++;
      }
    }

    if (batch.length) {
      revalidatePath("/admin/produtos");
      revalidatePath("/");
    }
    const remaining = Math.max(0, remainingBefore - batch.length);
    return {
      ok: true,
      processed: batch.length,
      repaired,
      cleared,
      remaining,
      message:
        remaining > 0
          ? `${repaired} reparada(s), ${cleared} sem foto neste lote · ${remaining} restante(s)...`
          : `Concluído! ${repaired} reparada(s), ${cleared} sem foto na Laquila (viraram placeholder).`,
    };
  } catch (err) {
    console.warn("[catalog] repairBrokenImages:", (err as Error)?.message);
    return { ok: false, processed: 0, repaired: 0, cleared: 0, remaining: -1, message: "Erro ao reparar imagens." };
  }
}

/* ------------------------- SALVAR CATEGORIAS ------------------------- */

export type CategoryEdit = {
  code: string;
  name: string;
  tagline: string;
  importEnabled: boolean;
  active: boolean;
  isDefault: boolean;
};

export async function saveCategories(edits: CategoryEdit[]): Promise<ActionResult> {
  await requireAdmin();
  try {
    const defaults = edits.filter((e) => e.isDefault);
    if (defaults.length > 1) return { ok: false, message: "Marque apenas UMA categoria como padrão." };

    for (const e of edits) {
      const name = e.name.trim() || e.code;
      await prisma.category.update({
        where: { code: e.code },
        data: {
          name,
          slug: slugify(name) || slugify(e.code),
          tagline: e.tagline.trim(),
          importEnabled: e.importEnabled,
          active: e.active,
          isDefault: e.isDefault,
        },
      });
    }

    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { ok: true, message: "Categorias salvas." };
  } catch (err) {
    console.warn("[catalog] saveCategories:", (err as Error)?.message);
    return { ok: false, message: "Erro ao salvar categorias." };
  }
}

/* ------------------------- SINCRONIZAR ESTOQUE (API) ------------------------- */

export async function syncStock(): Promise<ActionResult> {
  await requireAdmin();
  try {
    const totalVariants = await prisma.variant.count();
    if (totalVariants === 0) return { ok: false, message: "Nenhum produto no banco. Importe a planilha primeiro." };

    const r = await syncStockFromApi("manual");
    revalidatePath("/admin/estoque");
    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { ok: r.ok, message: r.message };
  } catch (err) {
    console.warn("[catalog] syncStock:", (err as Error)?.message);
    return { ok: false, message: "Erro ao sincronizar estoque." };
  }
}

/** Renomeia um produto (marca como revisado para não ser sobrescrito na reimportação). */
export async function renameProduct(productId: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const clean = name.trim();
    if (!clean) return { ok: false, message: "Nome vazio." };
    await prisma.product.update({ where: { id: productId }, data: { name: clean, reviewed: true } });
    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { ok: true, message: "Nome salvo." };
  } catch (err) {
    console.warn("[catalog] renameProduct:", (err as Error)?.message);
    return { ok: false, message: "Erro ao renomear." };
  }
}

/* ------------------------- EDITAR PRODUTO ------------------------- */

export type ProductEdit = {
  name: string;
  brand: string;
  categorySlug: string;
  categoria: string;
  subcategoria: string;
  description: string;
  descricaoComplementar: string;
  caracteristicas: string;
  image: string; // foto principal
  gallery: string[]; // todas as fotos (inclui a principal)
  active: boolean;
  bestSeller: boolean;
};

export async function updateProduct(id: string, data: ProductEdit): Promise<ActionResult> {
  await requireAdmin();
  try {
    // Ignora o placeholder: ele nunca deve ser a foto principal se houver imagem real.
    const gallery = data.gallery.map((s) => s.trim()).filter((u) => u && u !== PLACEHOLDER);
    const main = data.image.trim();
    const image = main && main !== PLACEHOLDER ? main : gallery[0] || PLACEHOLDER;
    await prisma.product.update({
      where: { id },
      data: {
        name: data.name.trim() || "Produto",
        brand: data.brand.trim() || "RunMotos",
        categorySlug: data.categorySlug.trim() || "sem-categoria",
        categoria: data.categoria.trim() || null,
        subcategoria: data.subcategoria.trim() || null,
        description: data.description,
        descricaoComplementar: data.descricaoComplementar.trim() || null,
        caracteristicas: data.caracteristicas.trim() || null,
        image,
        gallery: gallery.length ? gallery.join(",") : null,
        active: data.active,
        bestSeller: data.bestSeller,
        reviewed: true,
      },
    });
    revalidatePath("/admin/produtos");
    revalidatePath(`/admin/produtos/${id}`);
    revalidatePath("/");
    return { ok: true, message: "Produto salvo." };
  } catch (err) {
    console.warn("[catalog] updateProduct:", (err as Error)?.message);
    return { ok: false, message: "Erro ao salvar o produto." };
  }
}

/** Atualiza peso (kg) e dimensões (cm) — aplicado a TODAS as variações do produto. */
export async function updateProductShipping(
  productId: string,
  dims: { weight: number; length: number; width: number; height: number }
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.variant.updateMany({
      where: { productId },
      data: {
        pesoBruto: dims.weight > 0 ? dims.weight : null,
        // guardamos em METROS (padrão da planilha); o frete converte p/ cm.
        comprimentoCaixa: dims.length > 0 ? dims.length / 100 : null,
        larguraCaixa: dims.width > 0 ? dims.width / 100 : null,
        alturaCaixa: dims.height > 0 ? dims.height / 100 : null,
      },
    });
    revalidatePath(`/admin/produtos`);
    return { ok: true, message: "Frete atualizado." };
  } catch (err) {
    console.warn("[catalog] updateProductShipping:", (err as Error)?.message);
    return { ok: false, message: "Erro ao salvar peso/dimensões." };
  }
}

export type VariantEdit = { id: string; size: string; ean: string; cost: number; price: number; stock: number };

export async function updateVariants(productId: string, variants: VariantEdit[]): Promise<ActionResult> {
  await requireAdmin();
  try {
    for (const v of variants) {
      await prisma.variant.update({
        where: { id: v.id },
        data: {
          size: v.size.trim() || null,
          ean: v.ean.trim() || null,
          cost: Number.isFinite(v.cost) ? v.cost : null,
          price: Number.isFinite(v.price) ? v.price : 0,
          stock: Number.isFinite(v.stock) ? Math.round(v.stock) : 0,
        },
      });
    }
    revalidatePath("/admin/produtos");
    revalidatePath(`/admin/produtos/${productId}`);
    revalidatePath("/");
    return { ok: true, message: "Variações salvas." };
  } catch (err) {
    console.warn("[catalog] updateVariants:", (err as Error)?.message);
    return { ok: false, message: "Erro ao salvar as variações." };
  }
}

/* ------------------------- ADICIONAR PRODUTO MANUAL ------------------------- */

export type ManualProductInput = {
  name: string;
  brand: string;
  categoria: string;
  subcategoria: string;
  price: number;
  cost: number;
  stock: number;
  sizes: string; // separados por vírgula (opcional)
  description: string;
  image: string;
  weight: number; // kg
  length: number; // cm
  width: number; // cm
  height: number; // cm
};

export async function createProductManual(input: ManualProductInput): Promise<ActionResult> {
  await requireAdmin();
  try {
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Informe o nome do produto." };
    if (!(input.price > 0)) return { ok: false, message: "Informe um preço válido." };

    const brand = input.brand.trim() || "RunMotos";
    const base = slugify(name) || "produto";
    const hash = shortHash(name + Date.now());
    const image = input.image.trim() || PLACEHOLDER;
    const sizes = input.sizes.split(",").map((s) => s.trim()).filter(Boolean);

    const variants = (sizes.length ? sizes : [null]).map((size, i) => ({
      cdItem: `MAN-${hash}-${i}`,
      size,
      price: input.price,
      cost: input.cost > 0 ? input.cost : null,
      stock: Math.max(0, Math.round(input.stock || 0)),
      pesoBruto: input.weight > 0 ? input.weight : null,
      comprimentoCaixa: input.length > 0 ? input.length / 100 : null, // cm -> m
      larguraCaixa: input.width > 0 ? input.width / 100 : null,
      alturaCaixa: input.height > 0 ? input.height / 100 : null,
    }));

    await prisma.product.create({
      data: {
        baseKey: `${base}-${hash}`,
        slug: `${base.slice(0, 70)}-${hash}`,
        name,
        rawName: name,
        description: input.description.trim() || name,
        brand,
        categorySlug: slugify(brand),
        grupoCode: brand,
        categoria: input.categoria.trim() || null,
        subcategoria: input.subcategoria.trim() || null,
        image,
        gallery: input.image.trim() || null,
        reviewed: true,
        variants: { create: variants },
      },
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");
    return { ok: true, message: "Produto criado." };
  } catch (err) {
    console.warn("[catalog] createProductManual:", (err as Error)?.message);
    return { ok: false, message: "Erro ao criar o produto." };
  }
}

/* ------------------------- CATEGORIAS (IA + manual) ------------------------- */

async function existingCategories() {
  const rows = await prisma.product.findMany({
    where: { OR: [{ categoria: { not: null } }, { subcategoria: { not: null } }] },
    select: { categoria: true, subcategoria: true },
  });
  return {
    categorias: [...new Set(rows.map((r) => r.categoria).filter((s): s is string => !!s))],
    subcategorias: [...new Set(rows.map((r) => r.subcategoria).filter((s): s is string => !!s))],
  };
}

/** IA: sugere e aplica categoria + subcategoria para os produtos selecionados. */
export async function suggestCategories(productIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  if (!isOpenAIConfigured()) {
    return { ok: false, message: "Configure OPENAI_API_KEY no .env.local para usar a IA." };
  }
  if (productIds.length === 0) return { ok: false, message: "Selecione ao menos um produto." };
  try {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, description: true, grupo: true, grandeGrupo: true, brand: true },
    });
    const existing = await existingCategories();
    const results = await classifyProducts(
      products.map((p) => ({
        id: p.id,
        nome: p.name,
        descricao: p.description,
        grupo: p.grupo,
        grandeGrupo: p.grandeGrupo,
        marca: p.brand,
      })),
      existing
    );
    let n = 0;
    for (const r of results) {
      await prisma.product.update({
        where: { id: r.id },
        data: { categoria: r.categoria || null, subcategoria: r.subcategoria || null },
      });
      n++;
    }
    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    return { ok: true, message: `${n} produto(s) categorizado(s) pela IA.` };
  } catch (err) {
    console.warn("[ai] suggestCategories:", (err as Error)?.message);
    return { ok: false, message: `Erro na IA: ${(err as Error)?.message}` };
  }
}

/** Aplica manualmente categoria/subcategoria a vários produtos. */
export async function bulkSetCategory(productIds: string[], categoria: string, subcategoria: string): Promise<ActionResult> {
  await requireAdmin();
  if (productIds.length === 0) return { ok: false, message: "Selecione ao menos um produto." };
  try {
    await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { categoria: categoria.trim() || null, subcategoria: subcategoria.trim() || null },
    });
    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    return { ok: true, message: `Categoria aplicada a ${productIds.length} produto(s).` };
  } catch (err) {
    console.warn("[catalog] bulkSetCategory:", (err as Error)?.message);
    return { ok: false, message: "Erro ao aplicar categoria." };
  }
}

/** Renomeia uma categoria ou subcategoria em todos os produtos que a usam. */
export async function renameCategory(
  field: "categoria" | "subcategoria",
  oldName: string,
  newName: string
): Promise<ActionResult> {
  await requireAdmin();
  const novo = newName.trim();
  if (!novo) return { ok: false, message: "Nome vazio." };
  try {
    const r = await prisma.product.updateMany({
      where: field === "categoria" ? { categoria: oldName } : { subcategoria: oldName },
      data: field === "categoria" ? { categoria: novo } : { subcategoria: novo },
    });
    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    return { ok: true, message: `${r.count} produto(s) atualizados.` };
  } catch (err) {
    console.warn("[catalog] renameCategory:", (err as Error)?.message);
    return { ok: false, message: "Erro ao renomear." };
  }
}

/** Exclui os produtos selecionados (e suas variações, via cascade). */
export async function deleteProducts(productIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  if (productIds.length === 0) return { ok: false, message: "Selecione ao menos um produto." };
  try {
    const r = await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");
    return { ok: true, message: `${r.count} produto(s) excluído(s).` };
  } catch (err) {
    console.warn("[catalog] deleteProducts:", (err as Error)?.message);
    return { ok: false, message: "Erro ao excluir produtos." };
  }
}

/** Apaga TODOS os produtos e variações (catálogo). Use para reimportar do zero. */
export async function deleteAllProducts(): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.variant.deleteMany();
    const r = await prisma.product.deleteMany();
    await prisma.category.updateMany({ data: { productCount: 0, active: false } });
    revalidatePath("/admin/produtos");
    revalidatePath("/admin/importar");
    revalidatePath("/");
    return { ok: true, message: `${r.count} produto(s) excluído(s). Catálogo limpo.` };
  } catch (err) {
    console.warn("[catalog] deleteAllProducts:", (err as Error)?.message);
    return { ok: false, message: "Erro ao excluir produtos." };
  }
}

export async function toggleActive(productId: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.product.update({ where: { id: productId }, data: { active } });
    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { ok: true, message: active ? "Produto ativado." : "Produto desativado." };
  } catch (err) {
    console.warn("[catalog] toggleActive:", (err as Error)?.message);
    return { ok: false, message: "Erro ao atualizar o produto." };
  }
}

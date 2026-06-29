"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "./admin-guard";
import { sendOrderShippedCustomer } from "@/lib/email";
import { toOrderEmailData } from "@/lib/order-email";
import {
  calculateAllRates,
  generateLabel,
  isEnviaConfigured,
  type EnviaAddress,
  type EnviaGenAddress,
  type EnviaPackage,
  type ShippingOption,
} from "@/lib/envia";

export type ShipItem = { slug: string; size?: string; qty: number };

export type ShippingResult =
  | { ok: true; options: ShippingOption[] }
  | { ok: false; error: string };

/** Resolve cidade/estado/rua a partir do CEP (ViaCEP). */
async function addressFromCep(cep: string): Promise<{ city: string; state: string; street: string; district: string; postalCode: string } | null> {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store" });
    const d = (await r.json()) as { erro?: boolean; localidade?: string; uf?: string; logradouro?: string; bairro?: string };
    if (d.erro || !d.localidade || !d.uf) return null;
    return { city: d.localidade, state: d.uf, street: d.logradouro || "Centro", district: d.bairro || "Centro", postalCode: cep };
  } catch {
    return null;
  }
}

function phoneBR(raw: string | null | undefined): string {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.length >= 10 ? `+55${d}` : "+5511999999999";
}

export async function getShippingOptions(toCep: string, items: ShipItem[]): Promise<ShippingResult> {
  if (!isEnviaConfigured()) return { ok: false, error: "Frete (Envia.com) ainda não configurado." };
  const cep = toCep.replace(/\D/g, "");
  if (cep.length !== 8) return { ok: false, error: "CEP inválido." };
  if (items.length === 0) return { ok: false, error: "Carrinho vazio." };

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const fromCep = (setting?.originCep ?? "").replace(/\D/g, "");
  if (fromCep.length !== 8) return { ok: false, error: "Defina o CEP de origem em Configurações da loja." };

  try {
    const [originAddr, destAddr] = await Promise.all([addressFromCep(fromCep), addressFromCep(cep)]);
    if (!originAddr) return { ok: false, error: "CEP de origem inválido (verifique nas Configurações)." };
    if (!destAddr) return { ok: false, error: "CEP de destino não encontrado." };

    const origin: EnviaAddress = {
      name: setting?.storeName || "RunMotos",
      phone: phoneBR(setting?.contactPhone),
      country: "BR",
      ...originAddr,
    };
    const destination: EnviaAddress = {
      name: "Cliente",
      phone: "+5511999999999",
      country: "BR",
      ...destAddr,
    };

    const packages: EnviaPackage[] = [];
    for (const it of items) {
      const product = await prisma.product.findUnique({ where: { slug: it.slug }, include: { variants: true } });
      if (!product) continue;
      const v = product.variants.find((x) => (x.size ?? "") === (it.size ?? "")) ?? product.variants[0];
      if (!v) continue;
      // dimensões da caixa vêm em metros na planilha -> cm; aplica mínimos.
      const w = Math.round((v.larguraCaixa ?? 0) * 100);
      const h = Math.round((v.alturaCaixa ?? 0) * 100);
      const l = Math.round((v.comprimentoCaixa ?? 0) * 100);
      const kg = v.pesoBruto ?? v.pesoLiquido ?? 0;
      packages.push({
        type: "box",
        content: product.name.slice(0, 60),
        amount: Math.max(1, it.qty),
        declaredValue: Number((v.price * Math.max(1, it.qty)).toFixed(2)),
        lengthUnit: "CM",
        weightUnit: "KG",
        weight: Math.max(0.1, kg || 0.5),
        dimensions: {
          length: Math.max(11, l || 20),
          width: Math.max(11, w || 15),
          height: Math.max(2, h || 10),
        },
      });
    }
    if (packages.length === 0) return { ok: false, error: "Não foi possível montar o pacote." };

    const options = await calculateAllRates(origin, destination, packages);
    if (options.length === 0) return { ok: false, error: "Nenhuma opção de frete para este CEP." };
    return { ok: true, options };
  } catch (err) {
    console.warn("[shipping] getShippingOptions:", (err as Error)?.message);
    return { ok: false, error: (err as Error)?.message ?? "Erro ao calcular o frete." };
  }
}

/* ------------------------- GERAR ETIQUETA (Envia.com) ------------------------- */

export type LabelResult = { ok: boolean; message: string; labelUrl?: string; trackingCode?: string };

/** Gera a etiqueta do pedido no Envia.com (cria o envio) e salva no pedido. */
export async function generateShippingLabel(orderId: string): Promise<LabelResult> {
  await requireAdmin();
  if (!isEnviaConfigured()) return { ok: false, message: "Envia.com não configurado (ENVIA_TOKEN)." };
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return { ok: false, message: "Pedido não encontrado." };
    if (order.labelUrl) {
      return { ok: true, message: "Etiqueta já gerada.", labelUrl: order.labelUrl, trackingCode: order.trackingCode ?? undefined };
    }
    if (!order.shippingCarrier || !order.shippingService) {
      return { ok: false, message: "Pedido sem transportadora/serviço salvos (pedido antigo). Gere a etiqueta manualmente no painel do Envia." };
    }

    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    const fromCep = (setting?.originCep ?? "").replace(/\D/g, "");
    if (fromCep.length !== 8) return { ok: false, message: "Defina o CEP de origem em Configurações da loja." };
    const toCep = (order.cep ?? "").replace(/\D/g, "");
    if (toCep.length !== 8) return { ok: false, message: "Pedido sem CEP de destino válido." };

    const [originAddr, destAddr] = await Promise.all([addressFromCep(fromCep), addressFromCep(toCep)]);
    if (!originAddr) return { ok: false, message: "CEP de origem inválido (Configurações)." };
    if (!destAddr) return { ok: false, message: "CEP de destino inválido." };

    const origin: EnviaGenAddress = {
      name: setting?.storeName || "RunMotos",
      company: setting?.storeName || "RunMotos",
      email: setting?.contactEmail || undefined,
      phone: phoneBR(setting?.contactPhone),
      street: originAddr.street,
      number: "S/N",
      district: originAddr.district,
      city: originAddr.city,
      state: originAddr.state,
      country: "BR",
      postalCode: fromCep,
    };
    const destination: EnviaGenAddress = {
      name: order.customerName,
      email: order.email || undefined,
      phone: phoneBR(order.phone),
      street: order.address || destAddr.street,
      number: order.addressNumber || "S/N",
      district: destAddr.district,
      city: order.city || destAddr.city,
      state: order.uf || destAddr.state,
      country: "BR",
      postalCode: toCep,
    };

    // Pacotes a partir das variações do pedido (dimensões/peso por SKU).
    const cds = order.items.map((i) => i.cdItem);
    const variants = await prisma.variant.findMany({
      where: { cdItem: { in: cds } },
      select: { cdItem: true, larguraCaixa: true, alturaCaixa: true, comprimentoCaixa: true, pesoBruto: true, pesoLiquido: true, price: true },
    });
    const byCd = new Map(variants.map((v) => [v.cdItem, v]));
    const packages: EnviaPackage[] = order.items.map((it) => {
      const v = byCd.get(it.cdItem);
      const w = Math.round((v?.larguraCaixa ?? 0) * 100);
      const h = Math.round((v?.alturaCaixa ?? 0) * 100);
      const l = Math.round((v?.comprimentoCaixa ?? 0) * 100);
      const kg = v?.pesoBruto ?? v?.pesoLiquido ?? 0;
      return {
        type: "box",
        content: it.productName.slice(0, 60),
        amount: Math.max(1, it.qty),
        declaredValue: Number(((v?.price ?? it.price) * Math.max(1, it.qty)).toFixed(2)),
        lengthUnit: "CM",
        weightUnit: "KG",
        weight: Math.max(0.1, kg || 0.5),
        dimensions: { length: Math.max(11, l || 20), width: Math.max(11, w || 15), height: Math.max(2, h || 10) },
      };
    });

    const r = await generateLabel({ origin, destination, packages, carrier: order.shippingCarrier, service: order.shippingService });
    if (!r.ok) return { ok: false, message: r.error };

    await prisma.order.update({
      where: { id: orderId },
      data: { trackingCode: r.trackingNumber || null, labelUrl: r.labelUrl || null, status: "enviado" },
    });
    revalidatePath(`/admin/pedidos/${orderId}`);
    revalidatePath("/admin/pedidos");

    // Avisa o cliente que o pedido foi enviado (com o rastreio).
    await sendOrderShippedCustomer(toOrderEmailData(order), {
      carrier: order.shippingCarrier,
      trackingCode: r.trackingNumber,
      labelUrl: r.labelUrl,
    });

    return { ok: true, message: "Etiqueta gerada!", labelUrl: r.labelUrl, trackingCode: r.trackingNumber };
  } catch (err) {
    console.warn("[shipping] generateLabel:", (err as Error)?.message);
    return { ok: false, message: "Erro ao gerar etiqueta." };
  }
}

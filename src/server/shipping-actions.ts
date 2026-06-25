"use server";

import { prisma } from "@/lib/db";
import { calculateAllRates, isEnviaConfigured, type EnviaAddress, type EnviaPackage, type ShippingOption } from "@/lib/envia";

export type ShipItem = { slug: string; size?: string; qty: number };

export type ShippingResult =
  | { ok: true; options: ShippingOption[] }
  | { ok: false; error: string };

/** Resolve cidade/estado/rua a partir do CEP (ViaCEP). */
async function addressFromCep(cep: string): Promise<{ city: string; state: string; street: string; postalCode: string } | null> {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store" });
    const d = (await r.json()) as { erro?: boolean; localidade?: string; uf?: string; logradouro?: string };
    if (d.erro || !d.localidade || !d.uf) return null;
    return { city: d.localidade, state: d.uf, street: d.logradouro || "Centro", postalCode: cep };
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

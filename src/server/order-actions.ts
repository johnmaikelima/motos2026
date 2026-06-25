"use server";

/**
 * Server Action — roda SOMENTE no servidor.
 *
 * O pedido é salvo na NOSSA loja (banco). NÃO vai automático para a Laquila —
 * o envio à Laquila será uma ação manual, depois.
 *
 * Importante: SEMPRE revalide preço e estoque no servidor antes de salvar —
 * nunca confie no preço que veio do front (o usuário pode adulterar).
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getShippingOptions } from "./shipping-actions";

export type CheckoutInput = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  cidade: string;
  uf: string;
  cdTransportador: string;
  itens: { slug: string; qty: number; size?: string }[];
  shipping?: { price: number; method: string };
};

export type CheckoutResult =
  | { ok: true; idPedido: string; orderId: string; total: number }
  | { ok: false; error: string };

export async function submitOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (!input.nome || !input.cpf || input.itens.length === 0) {
    return { ok: false, error: "Dados incompletos." };
  }

  // Revalida cada item com o preço/estoque REAIS da variação escolhida (tamanho).
  const orderItems: { cdItem: string; productName: string; size: string | null; qty: number; price: number }[] = [];
  let total = 0;

  for (const it of input.itens) {
    const product = await prisma.product.findUnique({
      where: { slug: it.slug },
      include: { variants: true },
    });
    if (!product) return { ok: false, error: `Produto indisponível: ${it.slug}` };

    const variant =
      product.variants.find((v) => (v.size ?? "") === (it.size ?? "")) ??
      (product.variants.length === 1 ? product.variants[0] : undefined);
    if (!variant) return { ok: false, error: `Selecione um tamanho válido para ${product.name}` };
    if (variant.stock < it.qty) {
      return { ok: false, error: `Estoque insuficiente para ${product.name}${it.size ? ` (${it.size})` : ""}` };
    }

    total += variant.price * it.qty;
    orderItems.push({
      cdItem: variant.cdItem,
      productName: product.name,
      size: variant.size,
      qty: it.qty,
      price: variant.price,
    });
  }

  try {
    // Número sequencial amigável (começa em 1001).
    const last = await prisma.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
    const number = (last?.number ?? 1000) + 1;

    const cpf = input.cpf.replace(/\D/g, "");
    const phone = input.telefone.replace(/\D/g, "");
    const cep = input.cep.replace(/\D/g, "");
    const email = input.email.trim().toLowerCase();

    // Conta automática: cria/atualiza o cliente por e-mail e guarda os dados para a próxima compra.
    let customerId: string | undefined;
    if (email) {
      const data = {
        name: input.nome,
        cpf,
        phone,
        cep,
        address: input.endereco,
        addressNumber: input.numero,
        city: input.cidade,
        uf: input.uf,
      };
      const customer = await prisma.customer.upsert({
        where: { email },
        update: data,
        create: { email, ...data },
      });
      customerId = customer.id;
    }

    // Frete: RECALCULA no servidor — nunca confia no preço enviado pelo cliente.
    const shippingMethod = input.shipping?.method ?? null;
    let shippingPrice = Math.max(0, input.shipping?.price ?? 0);
    try {
      const ship = await getShippingOptions(input.cep, input.itens.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty })));
      if (ship.ok && ship.options.length > 0) {
        const match = shippingMethod
          ? ship.options.find((o) => o.name.toLowerCase() === shippingMethod.toLowerCase())
          : undefined;
        // usa o preço REAL da cotação (a opção escolhida, ou a mais barata)
        shippingPrice = match ? match.price : Math.min(...ship.options.map((o) => o.price));
      }
      // se a cotação falhar (Envia fora do ar), mantém o valor do cliente (logado abaixo)
    } catch (e) {
      console.warn("[checkout] frete não recalculado (usando valor do cliente):", (e as Error)?.message);
    }

    const order = await prisma.order.create({
      data: {
        number,
        status: "aguardando_pagamento",
        customerId,
        customerName: input.nome,
        cpf,
        email,
        phone,
        cep,
        address: input.endereco,
        addressNumber: input.numero,
        city: input.cidade,
        uf: input.uf,
        subtotal: total,
        shipping: shippingPrice,
        shippingMethod: input.shipping?.method ?? null,
        total: total + shippingPrice,
        items: { create: orderItems },
      },
    });

    revalidatePath("/admin/pedidos");
    return { ok: true, idPedido: String(order.number), orderId: order.id, total };
  } catch (err) {
    console.error("[checkout] erro ao salvar pedido:", err);
    return { ok: false, error: "Não foi possível registrar o pedido. Tente novamente." };
  }
}

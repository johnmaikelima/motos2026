import "server-only";
import { prisma } from "./db";
import type { OrderStatus } from "./order-status";

// Re-exporta para quem já importava daqui.
export { STATUS_LABEL, STATUS_STYLE } from "./order-status";
export type { OrderStatus } from "./order-status";

export type OrderItem = {
  cdItem: string;
  descricao: string;
  qtd: number;
  valor: number;
};

export type Order = {
  id: string; // id interno (cuid)
  numero: number; // número amigável do pedido
  cliente: string;
  documento: string;
  email: string;
  data: string; // YYYY-MM-DD
  status: OrderStatus;
  total: number;
  discount: number;
  pago: boolean;
  parcelas: number | null;
  itens: OrderItem[];
};

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

type DbOrder = Awaited<ReturnType<typeof loadOrders>>[number];

function loadOrders() {
  return prisma.order.findMany({ include: { items: true }, orderBy: { number: "desc" } });
}

function mapOrder(o: DbOrder): Order {
  return {
    id: o.id,
    numero: o.number,
    cliente: o.customerName,
    documento: formatCpf(o.cpf),
    email: o.email,
    data: o.createdAt.toISOString().slice(0, 10),
    status: o.status as OrderStatus,
    total: o.total,
    discount: o.discount ?? 0,
    pago: !!o.paidAt,
    parcelas: o.installments ?? null,
    itens: o.items.map((i) => ({
      cdItem: i.cdItem,
      descricao: i.productName + (i.size ? ` (${i.size})` : ""),
      qtd: i.qty,
      valor: i.price,
    })),
  };
}

export async function getOrders(): Promise<Order[]> {
  try {
    const rows = await loadOrders();
    return rows.map(mapOrder);
  } catch (err) {
    console.warn("[orders] getOrders:", (err as Error)?.message);
    return [];
  }
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  try {
    const o = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    return o ? mapOrder(o) : undefined;
  } catch (err) {
    console.warn("[orders] getOrderById:", (err as Error)?.message);
    return undefined;
  }
}

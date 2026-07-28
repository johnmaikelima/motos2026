import "server-only";
import type { OrderEmailData } from "./email";

/** Forma mínima de um pedido (com itens) vindo do Prisma p/ montar o e-mail. */
type DbOrderWithItems = {
  number: number;
  customerName: string;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  discount: number;
  address: string | null;
  addressNumber: string | null;
  city: string | null;
  uf: string | null;
  cep: string | null;
  items: { productName: string; size: string | null; qty: number; price: number }[];
};

/** Converte um pedido do banco (com itens) no formato dos e-mails de notificação. */
export function toOrderEmailData(o: DbOrderWithItems): OrderEmailData {
  return {
    number: o.number,
    customerName: o.customerName,
    email: o.email,
    items: o.items.map((i) => ({ name: i.productName, size: i.size, qty: i.qty, price: i.price })),
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    discount: o.discount ?? 0,
    address: { street: o.address, number: o.addressNumber, city: o.city, uf: o.uf, cep: o.cep },
  };
}

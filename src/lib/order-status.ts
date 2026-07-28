// Rótulos e estilos de status do pedido — SEM "server-only" para poder usar no cliente.

export type OrderStatus =
  | "aguardando_pagamento"
  | "pago"
  | "cancelado"
  | "enviado"
  | "enviado_laquila"
  | "entregue";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  enviado: "Enviado",
  enviado_laquila: "Enviado à Laquila",
  entregue: "Entregue",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  aguardando_pagamento: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pago: "bg-lime/15 text-lime border-lime/30",
  cancelado: "bg-red-500/15 text-red-300 border-red-500/30",
  enviado: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  enviado_laquila: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  entregue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

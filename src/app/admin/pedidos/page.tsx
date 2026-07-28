import { getOrders } from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import AdminOrdersTable from "@/components/admin/AdminOrdersTable";

export const dynamic = "force-dynamic"; // sempre dados atualizados

export default async function PedidosPage() {
  const orders = await getOrders();

  const pagos = orders.filter((o) => o.pago);
  const faturamento = pagos.reduce((s, o) => s + (o.total - o.discount), 0);
  const aguardando = orders.filter((o) => o.status === "aguardando_pagamento").length;

  const stats = [
    { label: "Pedidos", value: String(orders.length) },
    { label: "Faturamento (pago)", value: formatBRL(faturamento) },
    { label: "Pagos", value: String(pagos.length) },
    { label: "Aguardando pgto.", value: String(aguardando) },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-display text-3xl text-white">Pedidos</h1>
      </div>

      {orders.length === 0 && (
        <p className="mb-6 rounded-md border border-white/10 bg-ink-800 px-4 py-3 text-sm text-gray-400">
          Nenhum pedido ainda. Os pedidos feitos na loja aparecem aqui.
        </p>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-lime">{s.value}</p>
          </div>
        ))}
      </div>

      <AdminOrdersTable
        orders={orders.map((o) => ({
          id: o.id,
          numero: o.numero,
          cliente: o.cliente,
          data: o.data,
          status: o.status,
          total: o.total,
        }))}
      />
    </div>
  );
}

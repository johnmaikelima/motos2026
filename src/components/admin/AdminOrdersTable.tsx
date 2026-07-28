"use client";

import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/format";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/order-status";

export type OrderRow = {
  id: string;
  numero: number;
  cliente: string;
  data: string;
  status: string;
  total: number;
};

export default function AdminOrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Pedido</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => router.push(`/admin/pedidos/${o.id}`)}
                className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
              >
                <td className="px-4 py-3 font-semibold text-white">#{o.numero}</td>
                <td className="px-4 py-3 text-gray-300">{o.cliente}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(o.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[o.status as OrderStatus] ?? ""}`}>
                    {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-lime">{formatBRL(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meu pedido" };

export default async function MeuPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/conta");

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  // Segurança: só o dono do pedido pode ver.
  if (!order || order.customerId !== customer.id) notFound();

  const endereco = [order.address, order.addressNumber, order.city, order.uf].filter(Boolean).join(", ");

  return (
    <div className="container-rm py-10">
      <Link href="/conta" className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-lime">
        ← Voltar para minha conta
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-3xl text-white">Pedido #{order.number}</h1>
          <p className="mt-1 text-sm text-gray-400">{order.createdAt.toLocaleDateString("pt-BR")}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.status as OrderStatus] ?? ""}`}>
          {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="card overflow-hidden">
          <h2 className="px-6 pt-6 text-sm font-bold uppercase tracking-wide text-gray-400">Itens</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-y border-white/10 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-2 font-semibold">Produto</th>
                <th className="px-4 py-2 text-center font-semibold">Qtd</th>
                <th className="px-6 py-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-b border-white/5">
                  <td className="px-6 py-3 text-gray-200">
                    {it.productName}
                    {it.size ? <span className="text-gray-500"> · {it.size}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{it.qty}</td>
                  <td className="px-6 py-3 text-right text-gray-200">{formatBRL(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-white/10 px-6 py-4">
            <div className="flex justify-between text-base font-bold text-white">
              <span>Total</span>
              <span className="text-lime">{formatBRL(order.total)}</span>
            </div>
            {order.discount > 0 && (
              <>
                <div className="mt-1 flex justify-between text-sm text-gray-400">
                  <span>Desconto PIX</span>
                  <span>- {formatBRL(order.discount)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm font-bold text-lime">
                  <span>Valor pago</span>
                  <span>{formatBRL(order.total - order.discount)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card h-max p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Entrega & pagamento</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Endereço</dt>
              <dd className="text-right text-white">{endereco || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">CEP</dt>
              <dd className="text-right text-white">{order.cep || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Pagamento</dt>
              <dd className="text-right text-white">
                {order.paidAt ? `Pago${order.installments ? ` · ${order.installments}x` : ""}` : "Aguardando"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById, STATUS_LABEL, STATUS_STYLE } from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import ShippingLabelButton from "@/components/admin/ShippingLabelButton";

export const dynamic = "force-dynamic";

export default async function PedidoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/pedidos" className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-lime">
        ← Voltar para pedidos
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-display text-3xl text-white">Pedido #{order.numero}</h1>
        <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-6">
          <div className="card h-max p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Cliente</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Nome</dt>
                <dd className="text-right text-white">{order.cliente}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Documento</dt>
                <dd className="text-right text-white">{order.documento}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">E-mail</dt>
                <dd className="truncate text-right text-white">{order.email}</dd>
              </div>
              {order.telefone && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Telefone</dt>
                  <dd className="text-right text-white">{order.telefone}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Data</dt>
                <dd className="text-right text-white">
                  {new Date(order.data + "T00:00:00").toLocaleDateString("pt-BR")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Pagamento</dt>
                <dd className="text-right text-white">
                  {order.pago ? `Pago${order.parcelas ? ` · ${order.parcelas}x` : ""}` : "Pendente"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card h-max p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Entrega</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Endereço</dt>
                <dd className="text-right text-white">
                  {order.endereco
                    ? `${order.endereco}${order.numeroEndereco ? `, ${order.numeroEndereco}` : ""}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Cidade/UF</dt>
                <dd className="text-right text-white">
                  {order.cidade ? `${order.cidade} / ${order.uf ?? ""}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">CEP</dt>
                <dd className="text-right text-white">{order.cep ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Frete</dt>
                <dd className="text-right text-white">
                  {order.metodoFrete ?? "—"} · {formatBRL(order.frete)}
                </dd>
              </div>
              {order.transportadora && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Transportadora</dt>
                  <dd className="text-right text-white">
                    {order.transportadora}
                    {order.servicoFrete ? ` (${order.servicoFrete})` : ""}
                  </dd>
                </div>
              )}
              {order.rastreio && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Rastreio</dt>
                  <dd className="text-right text-white">{order.rastreio}</dd>
                </div>
              )}
            </dl>

            {order.etiquetaUrl ? (
              <a
                href={order.etiquetaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block w-full rounded-lg bg-lime px-4 py-2.5 text-center text-sm font-bold text-black transition hover:brightness-110"
              >
                Baixar etiqueta (PDF)
              </a>
            ) : (
              <ShippingLabelButton orderId={order.id} hasLabel={false} />
            )}
          </div>
        </div>

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
              {order.itens.map((it) => (
                <tr key={it.cdItem} className="border-b border-white/5">
                  <td className="px-6 py-3 text-gray-200">
                    {it.descricao}
                    <span className="block text-xs text-gray-500">{it.cdItem}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{it.qtd}</td>
                  <td className="px-6 py-3 text-right text-gray-200">{formatBRL(it.valor * it.qtd)}</td>
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
      </div>
    </div>
  );
}

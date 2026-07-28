import Link from "next/link";
import { getCurrentCustomer } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logoutCustomer } from "@/server/auth-actions";
import { formatBRL } from "@/lib/format";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/orders";
import AccountLogin from "@/components/AccountLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return (
      <div className="container-rm py-12">
        <div className="mx-auto max-w-md">
          <h1 className="heading-display mb-2 text-3xl text-white">Minha conta</h1>
          <p className="mb-6 text-sm text-gray-400">Entre com seu e-mail para ver seus pedidos e dados.</p>
          <AccountLogin />
        </div>
      </div>
    );
  }

  const orders = await prisma.order
    .findMany({
      where: { customerId: customer.id },
      orderBy: { number: "desc" },
      include: { items: true },
    })
    .catch(() => []);

  return (
    <div className="container-rm py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-3xl text-white">Minha conta</h1>
          <p className="mt-1 text-sm text-gray-400">{customer.name || customer.email}</p>
        </div>
        <form action={logoutCustomer}>
          <button className="btn-outline">Sair</button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="card h-max p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Meus dados</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Info label="E-mail" value={customer.email} />
            <Info label="Nome" value={customer.name} />
            <Info label="CPF" value={customer.cpf} />
            <Info label="Telefone" value={customer.phone} />
            <Info
              label="Endereço"
              value={[customer.address, customer.addressNumber, customer.city, customer.uf].filter(Boolean).join(", ")}
            />
          </dl>
          <p className="mt-3 text-[11px] text-gray-500">Os dados são atualizados a cada compra.</p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Meus pedidos ({orders.length})</h2>
          {orders.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              Você ainda não tem pedidos. <Link href="/produtos" className="text-lime">Ver produtos</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/conta/pedido/${o.id}`}
                  className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-lime/40"
                >
                  <div>
                    <p className="font-semibold text-white">Pedido #{o.number}</p>
                    <p className="text-xs text-gray-400">
                      {o.createdAt.toLocaleDateString("pt-BR")} · {o.items.length} item(ns)
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[o.status as OrderStatus] ?? ""}`}>
                    {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                  </span>
                  <span className="font-bold text-lime">{formatBRL(o.total)} →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="truncate text-right text-white">{value || "—"}</dd>
    </div>
  );
}

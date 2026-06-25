import Link from "next/link";
import { logout } from "@/server/admin-auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Painel administrativo", robots: { index: false } };

async function dbOnline(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const online = await dbOnline();
  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      {!online && (
        <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <strong>Banco de dados offline.</strong> O MySQL não está acessível — por isso nada aparece.
          Seus dados NÃO foram perdidos; só inicie o MySQL (use o atalho <strong>iniciar-loja.bat</strong> ou
          o Laragon → Start All) e recarregue a página.
        </div>
      )}
      <div className="mb-8 flex flex-col gap-4 border-b border-white/5 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <span className="heading-display text-lg text-white">
            Run<span className="text-lime">Motos</span> · Painel
          </span>
          <nav className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <Link href="/admin/produtos" className="hover:text-lime">Produtos</Link>
            <Link href="/admin/importar" className="hover:text-lime">Importar</Link>
            <Link href="/admin/estoque" className="hover:text-lime">Estoque</Link>
            <Link href="/admin/tamanhos" className="hover:text-lime">Tamanhos</Link>
            <Link href="/admin/promocoes" className="hover:text-lime">Promoções</Link>
            <Link href="/admin/pedidos" className="hover:text-lime">Pedidos</Link>
            <Link href="/admin/configuracoes" className="hover:text-lime">Config</Link>
            <Link href="/" className="hover:text-lime">Ver loja</Link>
          </nav>
        </div>
        <form action={logout}>
          <button type="submit" className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-red-400">
            Sair
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-rm flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="heading-display text-7xl text-lime">404</p>
      <h1 className="heading-display text-2xl text-white">Página não encontrada</h1>
      <p className="text-sm text-gray-400">A página que você procura saiu para uma volta de moto.</p>
      <Link href="/" className="btn-primary">Voltar ao início</Link>
    </div>
  );
}

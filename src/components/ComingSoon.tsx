import Link from "next/link";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="container-rm flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime">Em breve</p>
      <h1 className="heading-display text-4xl text-white">{title}</h1>
      <p className="max-w-md text-sm text-gray-400">
        Estamos preparando esta seção com muito capricho. Enquanto isso, confira nossas jaquetas.
      </p>
      <Link href="/produtos" className="btn-primary">Ver jaquetas</Link>
    </div>
  );
}

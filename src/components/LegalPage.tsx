export default function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-rm py-12">
      <article className="prose-rm mx-auto max-w-3xl">
        <h1 className="heading-display text-4xl text-white">{title}</h1>
        {updatedAt && <p className="mt-2 text-xs text-gray-500">Última atualização: {updatedAt}</p>}
        <div className="mt-8 flex flex-col gap-5 text-sm leading-relaxed text-gray-300 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_strong]:text-white">
          {children}
        </div>
      </article>
    </div>
  );
}

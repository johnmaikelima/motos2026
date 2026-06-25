import Image from "next/image";
import Link from "next/link";
import { getAllProducts } from "@/lib/products";
import { getHomeCategories } from "@/lib/home-settings";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import {
  ArrowRight,
  CardIcon,
  HeadsetIcon,
  ShieldIcon,
  TruckIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: ShieldIcon, title: "Proteção garantida", text: "Materiais resistentes e tecnologia de ponta." },
  { icon: TruckIcon, title: "Envio para todo Brasil", text: "Entrega rápida e segura para sua região." },
  { icon: CardIcon, title: "Até 10x sem juros", text: "Parcele suas compras com segurança." },
  { icon: HeadsetIcon, title: "Atendimento especializado", text: "Nossa equipe é apaixonada por motociclismo." },
];

const hasImg = (p: Product) => !!p.image && p.image !== "/placeholder.svg";
const catHref = (c: string) => `/produtos?categoria=${encodeURIComponent(c)}`;

export default async function HomePage() {
  const [all, chosen] = await Promise.all([getAllProducts(), getHomeCategories()]);

  // Agrupa por categoria (tipo de produto: Jaquetas, Capacetes, Calças...).
  const groups = new Map<string, Product[]>();
  for (const p of all) {
    if (!p.categoria) continue;
    const arr = groups.get(p.categoria) ?? [];
    arr.push(p);
    groups.set(p.categoria, arr);
  }
  // Dentro de cada grupo, produtos com foto e em estoque primeiro.
  for (const arr of groups.values()) {
    arr.sort(
      (a, b) =>
        Number(hasImg(b)) - Number(hasImg(a)) ||
        Number(b.stock > 0) - Number(a.stock > 0),
    );
  }

  // Ordem das categorias na home: a escolhida no painel; se vazia, todas por quantidade.
  const chosenValid = chosen.filter((name) => groups.has(name));
  const orderedNames = chosenValid.length
    ? chosenValid
    : [...groups.keys()].sort((a, b) => groups.get(b)!.length - groups.get(a)!.length);

  const categoryCards = orderedNames.map((name) => {
    const prods = groups.get(name)!;
    return {
      name,
      count: prods.length,
      image: prods.find(hasImg)?.image ?? prods[0]?.image ?? "/placeholder.svg",
    };
  });

  // Prateleiras: categorias com pelo menos 4 produtos (até 5 prateleiras).
  const shelves = categoryCards
    .filter((c) => c.count >= 4)
    .slice(0, 5)
    .map((c) => ({ ...c, products: groups.get(c.name)!.slice(0, 4) }));

  // Destaques: marcados como bestSeller; senão, os primeiros com foto.
  const flagged = all.filter((p) => p.bestSeller && hasImg(p));
  const bestSellers = (flagged.length ? flagged : all.filter(hasImg)).slice(0, 4);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1600&q=80"
            alt="Motociclista com jaqueta RunMotos"
            fill
            priority
            className="object-cover object-right opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/30" />
        </div>

        <div className="container-rm relative grid min-h-[560px] items-center py-16">
          <div className="max-w-xl">
            <p className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-lime">
              <span className="h-px w-8 bg-lime" /> Proteção. Conforto. Performance.
            </p>
            <h1 className="heading-display text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Equipamento
              <br />
              para quem vive
              <br />
              sobre <span className="text-lime">duas rodas.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-gray-300">
              Jaquetas, capacetes, luvas, botas e muito mais — proteção de alta
              qualidade com design moderno para qualquer estrada.
            </p>
            <Link href="/produtos" className="btn-primary mt-8">
              Ver coleção <ArrowRight width={18} height={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAIXA DE BENEFÍCIOS */}
      <section className="border-b border-white/5 bg-ink-900">
        <div className="container-rm grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <f.icon width={32} height={32} className="shrink-0 text-lime" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-white">{f.title}</h3>
                <p className="text-xs leading-relaxed text-gray-400">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIAS — cards com foto */}
      {categoryCards.length > 0 && (
        <section className="container-rm py-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="heading-display flex items-center gap-3 text-2xl text-white">
              <span className="h-px w-8 bg-lime" /> Categorias
            </h2>
            <Link href="/produtos" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-300 hover:text-lime">
              Ver tudo <ArrowRight width={14} height={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categoryCards.map((cat) => (
              <Link
                key={cat.name}
                href={catHref(cat.name)}
                className="card group relative flex h-44 flex-col justify-end overflow-hidden p-4 transition hover:border-lime/40"
              >
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-40 transition duration-500 group-hover:scale-105 group-hover:opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                <div className="relative">
                  <h3 className="heading-display text-xl leading-tight text-white">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* DESTAQUES */}
      {bestSellers.length > 0 && (
        <section className="container-rm pb-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="heading-display flex items-center gap-3 text-2xl text-white">
              <span className="h-px w-8 bg-lime" /> Destaques
            </h2>
            <Link href="/produtos" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-300 hover:text-lime">
              Ver todos <ArrowRight width={14} height={14} />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* PRATELEIRAS POR CATEGORIA */}
      {shelves.map((shelf) => (
        <section key={shelf.name} className="container-rm py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="heading-display flex items-center gap-3 text-2xl text-white">
              <span className="h-px w-8 bg-lime" /> {shelf.name}
            </h2>
            <Link href={catHref(shelf.name)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-300 hover:text-lime">
              Ver todos <ArrowRight width={14} height={14} />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shelf.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}

      <div className="container-rm pb-16 pt-6 text-center">
        <Link href="/produtos" className="btn-outline">
          Ver catálogo completo <ArrowRight width={16} height={16} />
        </Link>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { CartIcon, SearchIcon, UserIcon } from "./icons";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/produtos", label: "Jaquetas" },
  { href: "/luvas", label: "Luvas" },
  { href: "/acessorios", label: "Acessórios" },
  { href: "/sobre", label: "Sobre nós" },
  { href: "/contato", label: "Contato" },
];

export default function Header({
  storeName = "RunMotos",
  logoUrl = "",
  firstName = null,
}: {
  storeName?: string;
  logoUrl?: string;
  firstName?: string | null;
}) {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink/90 backdrop-blur">
      <div className="container-rm flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-1 text-2xl font-extrabold tracking-tight">
          {logoUrl ? (
            <span className="relative block h-14 w-52">
              <Image src={logoUrl} alt={storeName} fill className="object-contain object-left" sizes="208px" priority />
            </span>
          ) : (
            <span className="text-white">{storeName}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-xs font-semibold uppercase tracking-wider transition hover:text-lime ${
                  active ? "text-lime" : "text-gray-300"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute -bottom-2 left-0 h-0.5 w-full bg-lime" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 text-gray-200">
          <Link href="/busca" aria-label="Buscar" className="transition hover:text-lime">
            <SearchIcon width={20} height={20} />
          </Link>
          <Link href="/conta" aria-label="Minha conta" className="flex items-center gap-2 transition hover:text-lime">
            <UserIcon width={20} height={20} />
            {firstName && (
              <span className="hidden text-xs font-semibold sm:inline">
                Bem-vindo, <span className="text-lime">{firstName}</span>
              </span>
            )}
          </Link>
          <Link href="/carrinho" aria-label="Carrinho" className="relative transition hover:text-lime">
            <CartIcon width={22} height={22} />
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[10px] font-bold text-black">
              {count}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

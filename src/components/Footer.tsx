import Link from "next/link";
import { ArrowRight, CheckShield } from "./icons";
import type { StoreSettings } from "@/lib/store-settings";

const TRUST = [
  { title: "7 dias para troca", text: "Troca fácil e rápida sem burocracia." },
  { title: "Compra segura", text: "Seus dados protegidos do início ao fim." },
  { title: "Produtos originais", text: "Trabalhamos apenas com produtos de qualidade." },
  { title: "Paixão por duas rodas", text: "Mais que uma loja, somos motociclistas como você." },
];

export default function Footer({ settings }: { settings: StoreSettings }) {
  const social = [
    { href: settings.instagram, label: "Instagram" },
    { href: settings.facebook, label: "Facebook" },
    { href: settings.youtube, label: "YouTube" },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-white/5 bg-ink-900">
      <div className="container-rm grid gap-8 py-12 lg:grid-cols-[1.2fr_2fr]">
        {/* Newsletter */}
        <div className="card flex flex-col justify-center gap-4 p-6">
          <div>
            <h3 className="heading-display text-xl text-white">Receba novidades</h3>
            <p className="mt-1 text-sm text-gray-400">
              Cadastre seu e-mail e receba ofertas exclusivas da {settings.storeName}.
            </p>
          </div>
          <form className="flex overflow-hidden rounded-md border border-white/10 bg-ink-800">
            <input
              type="email"
              required
              placeholder="Seu melhor e-mail"
              className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500"
            />
            <button
              type="submit"
              aria-label="Cadastrar e-mail"
              className="flex items-center justify-center bg-lime px-4 text-black transition hover:bg-lime-400"
            >
              <ArrowRight width={18} height={18} />
            </button>
          </form>
        </div>

        {/* Selos de confiança */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex flex-col gap-2">
              <CheckShield width={22} height={22} className="text-lime" />
              <h4 className="text-sm font-bold uppercase tracking-wide text-white">{t.title}</h4>
              <p className="text-xs leading-relaxed text-gray-400">{t.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="container-rm flex flex-col items-center justify-between gap-4 py-6 text-xs text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.storeName}. Todos os direitos reservados.</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {social.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-lime">{s.label}</a>
            ))}
            <Link href="/politica-de-envio" className="hover:text-lime">Política de envio</Link>
            <Link href="/trocas-e-devolucoes" className="hover:text-lime">Trocas e devoluções</Link>
            <Link href="/politica-de-privacidade" className="hover:text-lime">Privacidade</Link>
            <Link href="/termos-de-uso" className="hover:text-lime">Termos de uso</Link>
            <Link href="/contato" className="hover:text-lime">Contato</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
